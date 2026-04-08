'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';

export default function OutboundPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoadingDiag, setIsLoadingDiag] = useState(false);

  useEffect(() => {
    if (!session) return;
    
    checkGmailConnection();
  }, [session]);

  const checkGmailConnection = async () => {
    try {
      const res = await fetch('http://localhost:4000/check-google-connection', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      const data = await res.json();
      setIsConnected(data.connected || false);
    } catch (err) {
      console.log('Gmail connection check failed, assuming not connected');
      setIsConnected(false);
    }
  };

  const handleConnectGoogle = () => {
    setIsConnecting(true);
    // Redirect to Google OAuth endpoint
    window.location.href = 'http://localhost:4000/auth/google';
  };

  const handleTroubleshoot = async () => {
    setIsLoadingDiag(true);
    try {
      const res = await fetch('http://localhost:4000/diagnose-gmail');
      const data = await res.json();
      setDiagnostics(data);
      setShowDiagnostics(true);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to run diagnostics',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingDiag(false);
    }
  };

  if (isConnected === null) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Connect Gmail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-3">
              <p className="text-gray-600">
                To send outbound emails, you need to connect your Gmail account.
              </p>
              <p className="text-sm text-gray-500">
                We'll use your Gmail to send personalized emails to prospects automatically.
              </p>
            </div>
            
            <Button 
              onClick={handleConnectGoogle}
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
            >
              {isConnecting ? 'Connecting...' : '🔗 Connect Gmail'}
            </Button>

            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>✅ Secure OAuth 2.0</p>
              <p>✅ Full Gmail API access</p>
              <p>✅ Send from your email</p>
            </div>

            <Button 
              onClick={handleTroubleshoot}
              disabled={isLoadingDiag}
              variant="outline"
              className="w-full"
            >
              {isLoadingDiag ? 'Checking...' : '🔧 Troubleshoot'}
            </Button>
          </CardContent>
        </Card>

        <GmailDiagnosticsModal 
          isOpen={showDiagnostics}
          onOpenChange={setShowDiagnostics}
          diagnostics={diagnostics}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Outbound Campaigns</h1>
        <div className="flex gap-2">
          <Button 
            onClick={handleTroubleshoot}
            disabled={isLoadingDiag}
            variant="outline"
            size="sm"
          >
            {isLoadingDiag ? '⏳' : '🔧'} Troubleshoot
          </Button>
          <Button onClick={() => router.push('/dashboard')}>
            Start Campaign
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <p className="text-gray-600">
            ✅ Gmail Connected. You can now create and manage outbound campaigns.
          </p>
        </CardContent>
      </Card>

      <GmailDiagnosticsModal 
        isOpen={showDiagnostics}
        onOpenChange={setShowDiagnostics}
        diagnostics={diagnostics}
      />
    </div>
  );
}

interface DiagnosticsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  diagnostics: any;
}

function GmailDiagnosticsModal({ isOpen, onOpenChange, diagnostics }: DiagnosticsModalProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const text = JSON.stringify(diagnostics, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!diagnostics) return null;

  const checks = diagnostics.checks || {};

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Gmail Connection Diagnostics
          </DialogTitle>
          <DialogDescription>
            Timestamp: {new Date(diagnostics.timestamp).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tokens Exist Check */}
          <CheckItem 
            title="Google Tokens"
            check={checks.tokensExist}
          />

          {/* Token Valid Check */}
          {checks.tokenValid && (
            <CheckItem 
              title="Token Validity"
              check={checks.tokenValid}
            />
          )}

          {/* Solutions */}
          {diagnostics.checks.tokenValid?.status === 'FAIL' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-900 flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4" />
                Solution Required
              </h4>
              <p className="text-amber-800 text-sm">
                {diagnostics.checks.tokenValid.solution}
              </p>
            </div>
          )}

          {/* Error Details */}
          {diagnostics.checks.tokenValid?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">Error Details</h4>
              <code className="text-xs bg-red-100 p-2 rounded block overflow-x-auto text-red-800">
                {diagnostics.checks.tokenValid.error}
              </code>
            </div>
          )}

          {/* Raw JSON */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-gray-700">Raw Diagnostics</h4>
              <Button 
                size="sm" 
                variant="outline"
                onClick={copyToClipboard}
                className="text-xs"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </Button>
            </div>
            <pre className="text-xs bg-white p-3 rounded border border-gray-300 overflow-x-auto">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CheckItemProps {
  title: string;
  check: any;
}

function CheckItem({ title, check }: CheckItemProps) {
  if (!check) return null;

  const statusConfig: Record<string, { icon: any; bg: string; text: string }> = {
    PASS: { icon: CheckCircle2, bg: 'bg-green-50', text: 'text-green-900' },
    FAIL: { icon: AlertCircle, bg: 'bg-red-50', text: 'text-red-900' },
    WARN: { icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-900' },
    ERROR: { icon: AlertCircle, bg: 'bg-red-50', text: 'text-red-900' }
  };

  const config = statusConfig[check.status] || statusConfig.ERROR;
  const IconComponent = config.icon;

  return (
    <div className={`border rounded-lg p-4 ${config.bg}`}>
      <div className="flex items-start gap-3">
        <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex gap-2 items-center">
            <h4 className={`font-semibold ${config.text}`}>{title}</h4>
            <span className={`text-xs px-2 py-1 rounded font-medium ${config.text}`}>
              {check.status}
            </span>
          </div>
          <p className={`text-sm mt-1 ${config.text}`}>
            {check.message}
          </p>
          {check.tokenType && (
            <p className={`text-xs mt-2 ${config.text} opacity-75`}>
              Token Type: {check.tokenType} | Access Token: {'✓' || '✗'} | Refresh Token: {'✓' || '✗'}
            </p>
          )}
          {check.gmailAddress && (
            <p className={`text-xs mt-2 ${config.text} opacity-75`}>
              Gmail Account: {check.gmailAddress} | Messages: {check.messagesTotal}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
