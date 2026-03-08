"""
FT-Transformer Model — Hospital Agent Copy

This is the same model architecture as the admin server.
Hospitals need this to perform local training.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math


class NumericalFeatureTokenizer(nn.Module):
    """Tokenizes each numerical feature into a d-dimensional embedding."""

    def __init__(self, n_features: int, d_token: int):
        super().__init__()
        self.weight = nn.Parameter(torch.empty(n_features, d_token))
        self.bias = nn.Parameter(torch.empty(n_features, d_token))
        nn.init.kaiming_uniform_(self.weight, a=math.sqrt(5))
        nn.init.zeros_(self.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x.unsqueeze(-1) * self.weight[None] + self.bias[None]


class MultiHeadAttention(nn.Module):
    def __init__(self, d_model: int, n_heads: int, dropout: float = 0.1):
        super().__init__()
        assert d_model % n_heads == 0
        self.d_k = d_model // n_heads
        self.n_heads = n_heads

        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, N, _ = x.shape
        q = self.W_q(x).view(B, N, self.n_heads, self.d_k).transpose(1, 2)
        k = self.W_k(x).view(B, N, self.n_heads, self.d_k).transpose(1, 2)
        v = self.W_v(x).view(B, N, self.n_heads, self.d_k).transpose(1, 2)

        scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(self.d_k)
        attn = self.dropout(F.softmax(scores, dim=-1))
        out = torch.matmul(attn, v)
        out = out.transpose(1, 2).contiguous().view(B, N, -1)
        return self.W_o(out)


class TransformerBlock(nn.Module):
    def __init__(self, d_model: int, n_heads: int, d_ffn: int, dropout: float = 0.1):
        super().__init__()
        self.attn = MultiHeadAttention(d_model, n_heads, dropout)
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.ffn = nn.Sequential(
            nn.Linear(d_model, d_ffn),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_ffn, d_model),
            nn.Dropout(dropout),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.norm1(x))
        x = x + self.ffn(self.norm2(x))
        return x


class FTTransformer(nn.Module):
    """Feature Tokenizer + Transformer for tabular data."""

    def __init__(
        self,
        n_features: int = 20,
        d_token: int = 64,
        n_heads: int = 4,
        n_layers: int = 3,
        d_ffn: int = 128,
        dropout: float = 0.15,
        n_classes: int = 2,
    ):
        super().__init__()
        self.n_features = n_features
        self.d_token = d_token

        self.tokenizer = NumericalFeatureTokenizer(n_features, d_token)
        self.cls_token = nn.Parameter(torch.zeros(1, 1, d_token))
        nn.init.normal_(self.cls_token, std=0.02)
        self.pos_embedding = nn.Parameter(torch.zeros(1, n_features + 1, d_token))
        nn.init.normal_(self.pos_embedding, std=0.02)

        self.transformer = nn.Sequential(*[
            TransformerBlock(d_token, n_heads, d_ffn, dropout)
            for _ in range(n_layers)
        ])

        self.norm = nn.LayerNorm(d_token)
        self.head = nn.Sequential(
            nn.Linear(d_token, d_token),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_token, n_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B = x.shape[0]
        tokens = self.tokenizer(x)
        cls = self.cls_token.expand(B, -1, -1)
        tokens = torch.cat([cls, tokens], dim=1)
        tokens = tokens + self.pos_embedding
        tokens = self.transformer(tokens)
        tokens = self.norm(tokens)
        cls_output = tokens[:, 0]
        return self.head(cls_output)

    def get_last_layer_params(self):
        """Get parameters of the classification head (for federated delta extraction)."""
        return {name: param.clone().detach() for name, param in self.head.named_parameters()}

    def set_last_layer_params(self, params: dict):
        """Apply federated delta to classification head."""
        state = self.head.state_dict()
        for name, value in params.items():
            if name in state:
                state[name] = value
        self.head.load_state_dict(state)


def create_model(n_features: int = 20, **kwargs) -> FTTransformer:
    """Factory function to create an FT-Transformer model."""
    return FTTransformer(n_features=n_features, **kwargs)
