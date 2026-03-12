/**
 * Service Status Component
 *
 * Displays the health status of all backend services.
 * Shows which services are online/offline and provides helpful guidance.
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Server, Key, Building2, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { checkAllServices, type ServiceHealth } from '@/lib/api';

interface ServiceStatusState {
  adminServer: ServiceHealth;
  hospitalAgent: ServiceHealth;
  keyholder: ServiceHealth;
  lastChecked: Date | null;
  isChecking: boolean;
}

export function ServiceStatus() {
  const [status, setStatus] = useState<ServiceStatusState>({
    adminServer: { service: 'Admin Server', status: 'offline' },
    hospitalAgent: { service: 'Hospital Agent', status: 'offline' },
    keyholder: { service: 'Keyholder', status: 'offline' },
    lastChecked: null,
    isChecking: false,
  });

  const checkServices = async () => {
    setStatus(prev => ({ ...prev, isChecking: true }));

    try {
      const result = await checkAllServices();
      setStatus({
        adminServer: result.adminServer,
        hospitalAgent: result.hospitalAgent,
        keyholder: result.keyholder,
        lastChecked: new Date(),
        isChecking: false,
      });
    } catch (error) {
      console.error('Health check failed:', error);
      setStatus(prev => ({
        ...prev,
        isChecking: false,
        lastChecked: new Date(),
      }));
    }
  };

  useEffect(() => {
    checkServices();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkServices, 30000);
    return () => clearInterval(interval);
  }, []);

  const allHealthy =
    status.adminServer.status === 'running' &&
    status.hospitalAgent.status === 'running' &&
    status.keyholder.status === 'running';

  const getStatusIcon = (service: ServiceHealth) => {
    if (service.status === 'running') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (service: ServiceHealth) => {
    if (service.status === 'running') {
      return <Badge variant="default" className="bg-green-500">Online</Badge>;
    }
    return <Badge variant="destructive">Offline</Badge>;
  };

  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Backend Services Status
            </CardTitle>
            <CardDescription>
              {status.lastChecked
                ? `Last checked: ${status.lastChecked.toLocaleTimeString()}`
                : 'Checking services...'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkServices}
            disabled={status.isChecking}
          >
            {status.isChecking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status Alert */}
        {!allHealthy && status.lastChecked && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Some services are offline. Start required services before performing operations.
            </AlertDescription>
          </Alert>
        )}

        {/* Service List */}
        <div className="space-y-3">
          {/* Admin Server */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              {getStatusIcon(status.adminServer)}
              <div>
                <div className="font-medium flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  Admin Server
                  <span className="text-xs text-muted-foreground">(Port 8000)</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Predictions & Model Aggregation
                </div>
              </div>
            </div>
            {getStatusBadge(status.adminServer)}
          </div>

          {/* Hospital Agent */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              {getStatusIcon(status.hospitalAgent)}
              <div>
                <div className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Hospital Agent
                  <span className="text-xs text-muted-foreground">(Port 8002)</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Local Training & Update Submission
                </div>
              </div>
            </div>
            {getStatusBadge(status.hospitalAgent)}
          </div>

          {/* Keyholder */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              {getStatusIcon(status.keyholder)}
              <div>
                <div className="font-medium flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  Keyholder
                  <span className="text-xs text-muted-foreground">(Port 8001)</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Encryption Key Management
                </div>
              </div>
            </div>
            {getStatusBadge(status.keyholder)}
          </div>
        </div>

        {/* Startup Instructions */}
        {!allHealthy && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50">
            <p className="text-sm font-medium mb-2">Start Backend Services:</p>
            <div className="space-y-1 text-xs font-mono text-muted-foreground">
              {status.keyholder.status !== 'running' && (
                <div>cd backend/keyholder && python main.py</div>
              )}
              {status.adminServer.status !== 'running' && (
                <div>cd backend/admin_server && python main.py</div>
              )}
              {status.hospitalAgent.status !== 'running' && (
                <div>cd backend/hospital_agent && python main.py</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ServiceStatus;
