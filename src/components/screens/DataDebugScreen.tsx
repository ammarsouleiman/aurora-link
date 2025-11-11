import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, AlertCircle } from '../ui/icons';
import { Button } from '../ui/button';
import { profileApi } from '../../utils/api';
import type { User } from '../../utils/types';

interface DataDebugScreenProps {
  currentUser: User;
  onBack: () => void;
}

export function DataDebugScreen({ currentUser, onBack }: DataDebugScreenProps) {
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runDiagnostic();
  }, []);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await profileApi.diagnostic();
      if (result.success && result.data) {
        setDiagnostic(result.data.diagnostic);
        console.log('🔍 Full Diagnostic Data:', result.data.diagnostic);
      } else {
        setError(result.error || 'Failed to run diagnostic');
      }
    } catch (err) {
      console.error('Diagnostic error:', err);
      setError('Failed to run diagnostic');
    } finally {
      setLoading(false);
    }
  };

  const handleRepair = async () => {
    setLoading(true);
    try {
      const result = await profileApi.repairCounts();
      if (result.success) {
        // Reload diagnostic after repair
        await runDiagnostic();
      } else {
        setError(result.error || 'Failed to repair counts');
      }
    } catch (err) {
      console.error('Repair error:', err);
      setError('Failed to repair counts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-accent rounded-full -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1>Data Debug</h1>
          <p className="text-sm text-muted-foreground">See your real data</p>
        </div>
        <button
          onClick={runDiagnostic}
          disabled={loading}
          className="p-2 hover:bg-accent rounded-full"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="m-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          </div>
        )}

        {loading && !diagnostic && (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Scanning database...</p>
          </div>
        )}

        {diagnostic && (
          <div className="p-4 space-y-4">
            {/* Summary Card */}
            <div className="bg-surface rounded-xl p-4 border border-border">
              <h2 className="mb-4">Your Profile Summary</h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="text-sm font-mono">{diagnostic.user_id?.substring(0, 8)}...</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Username:</span>
                  <span>{diagnostic.username || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-sm">{diagnostic.email || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Counts Comparison */}
            <div className="bg-surface rounded-xl p-4 border border-border">
              <h2 className="mb-4">Counts Comparison</h2>
              
              <div className="space-y-4">
                {/* Posts */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span>Posts</span>
                    {diagnostic.stored_counts.posts_count === diagnostic.actual_data.posts.count ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-background rounded p-2">
                      <p className="text-muted-foreground text-xs">Stored Count</p>
                      <p className="text-2xl">{diagnostic.stored_counts.posts_count}</p>
                    </div>
                    <div className="bg-background rounded p-2">
                      <p className="text-muted-foreground text-xs">Actual Count</p>
                      <p className="text-2xl text-[#00A8E8]">{diagnostic.actual_data.posts.count}</p>
                    </div>
                  </div>
                </div>

                {/* Followers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span>Followers</span>
                    {diagnostic.stored_counts.followers_count === diagnostic.actual_data.followers.count ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-background rounded p-2">
                      <p className="text-muted-foreground text-xs">Stored Count</p>
                      <p className="text-2xl">{diagnostic.stored_counts.followers_count}</p>
                    </div>
                    <div className="bg-background rounded p-2">
                      <p className="text-muted-foreground text-xs">Actual Count</p>
                      <p className="text-2xl text-[#00A8E8]">{diagnostic.actual_data.followers.count}</p>
                    </div>
                  </div>
                </div>

                {/* Following */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span>Following</span>
                    {diagnostic.stored_counts.following_count === diagnostic.actual_data.following.count ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-background rounded p-2">
                      <p className="text-muted-foreground text-xs">Stored Count</p>
                      <p className="text-2xl">{diagnostic.stored_counts.following_count}</p>
                    </div>
                    <div className="bg-background rounded p-2">
                      <p className="text-muted-foreground text-xs">Actual Count</p>
                      <p className="text-2xl text-[#00A8E8]">{diagnostic.actual_data.following.count}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actual Data Details */}
            {diagnostic.actual_data.posts.count > 0 && (
              <div className="bg-surface rounded-xl p-4 border border-border">
                <h2 className="mb-4">Your Posts ({diagnostic.actual_data.posts.count})</h2>
                <div className="space-y-2">
                  {diagnostic.actual_data.posts.full_list?.map((post: any, idx: number) => (
                    <div key={idx} className="bg-background rounded p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{post.type === 'reel' ? '🎥 Reel' : '📷 Post'}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {post.caption && (
                        <p className="text-muted-foreground text-xs">{post.caption}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 font-mono">ID: {post.id}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diagnostic.actual_data.followers.count > 0 && (
              <div className="bg-surface rounded-xl p-4 border border-border">
                <h2 className="mb-4">Your Followers ({diagnostic.actual_data.followers.count})</h2>
                <div className="space-y-2">
                  {diagnostic.actual_data.followers.array?.map((followerId: string, idx: number) => (
                    <div key={idx} className="bg-background rounded p-3 text-sm">
                      <p className="font-mono text-xs">{followerId}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diagnostic.actual_data.following.count > 0 && (
              <div className="bg-surface rounded-xl p-4 border border-border">
                <h2 className="mb-4">Following ({diagnostic.actual_data.following.count})</h2>
                <div className="space-y-2">
                  {diagnostic.actual_data.following.array?.map((followingId: string, idx: number) => (
                    <div key={idx} className="bg-background rounded p-3 text-sm">
                      <p className="font-mono text-xs">{followingId}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="bg-surface rounded-xl p-4 border border-border">
              <h2 className="mb-4">Recommendations</h2>
              <div className="space-y-2">
                {diagnostic.recommendations?.map((rec: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    {rec.includes('✅') ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button */}
            {diagnostic.recommendations?.some((r: string) => r.includes('mismatch')) && (
              <Button
                onClick={handleRepair}
                disabled={loading}
                className="w-full bg-[#00A8E8] hover:bg-[#0096D1] text-white"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  'Fix Counts Now'
                )}
              </Button>
            )}

            {/* Console Note */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                💡 Press F12 to open developer console and see detailed server logs
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
