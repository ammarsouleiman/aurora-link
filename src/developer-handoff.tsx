import { useState } from 'react';
import { Code, Database, Palette, Component, Smartphone, Globe, Copy, Check } from 'lucide-react';
import { Button } from './components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import designTokens from './design-tokens.json';

export default function DeveloperHandoff() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const CopyButton = ({ text, section }: { text: string; section: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(text, section)}
      className="absolute top-2 right-2"
    >
      {copiedSection === section ? (
        <Check className="w-4 h-4 text-success" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-3xl">💬</span>
            </div>
            <div>
              <h1>AuroraLink</h1>
              <p className="text-muted-foreground">Developer Handoff Documentation v1.0</p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            Complete design system, component library, and technical specifications for the AuroraLink messaging application.
            This document provides all necessary information for iOS, Android, and Web development teams.
          </p>
        </div>

        <Tabs defaultValue="tokens" className="space-y-8">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
            <TabsTrigger value="tokens">
              <Palette className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Tokens</span>
            </TabsTrigger>
            <TabsTrigger value="components">
              <Component className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Components</span>
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Database</span>
            </TabsTrigger>
            <TabsTrigger value="api">
              <Code className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="mobile">
              <Smartphone className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Mobile</span>
            </TabsTrigger>
            <TabsTrigger value="web">
              <Globe className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Web</span>
            </TabsTrigger>
          </TabsList>

          {/* Design Tokens */}
          <TabsContent value="tokens" className="space-y-6">
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="mb-4">Design Tokens</h2>
              <p className="text-muted-foreground mb-6">
                All design tokens are exportable as JSON and can be imported into design tools or code.
                Download the complete token set: <code className="bg-muted px-2 py-1 rounded">/design-tokens.json</code>
              </p>

              {/* Colors */}
              <div className="mb-8">
                <h3 className="mb-4">Colors</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="mb-2">Primary Blue</p>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-12 h-12 rounded-lg bg-[#0057FF] border border-border" />
                      <div>
                        <code className="text-sm">#0057FF</code>
                        <p className="text-xs text-muted-foreground">RGB: 0, 87, 255</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="mb-2">Accent Green</p>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-12 h-12 rounded-lg bg-[#00D4A6] border border-border" />
                      <div>
                        <code className="text-sm">#00D4A6</code>
                        <p className="text-xs text-muted-foreground">RGB: 0, 212, 166</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2">Error Red</p>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-12 h-12 rounded-lg bg-[#FF4D4F] border border-border" />
                      <div>
                        <code className="text-sm">#FF4D4F</code>
                        <p className="text-xs text-muted-foreground">RGB: 255, 77, 79</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative bg-muted rounded-lg p-4">
                  <h4 className="mb-2">CSS Variables</h4>
                  <pre className="text-sm overflow-x-auto">
{`--primary: #0057FF;
--accent: #00D4A6;
--error: #FF4D4F;
--warning: #FFB020;
--success: #00D4A6;
--info: #2F80ED;

/* Light Theme */
--background: #FFFFFF;
--surface: #F9FAFB;
--text-primary: #111827;
--text-secondary: #6B7280;
--border: #E5E7EB;

/* Dark Theme */
--background: #0F1724;
--surface: #1A2332;
--text-primary: #F9FAFB;
--text-secondary: #D1D5DB;
--border: #2D3748;`}
                  </pre>
                  <CopyButton text={`--primary: #0057FF;\n--accent: #00D4A6;\n...`} section="css-vars" />
                </div>
              </div>

              {/* Typography */}
              <div className="mb-8">
                <h3 className="mb-4">Typography</h3>
                <div className="space-y-4">
                  <div className="flex items-baseline gap-4 pb-2 border-b border-border">
                    <span className="w-24 text-sm text-muted-foreground">Display</span>
                    <span style={{ fontSize: '40px', lineHeight: '48px' }}>The quick brown fox</span>
                    <code className="text-sm ml-auto">40px / 48px</code>
                  </div>
                  <div className="flex items-baseline gap-4 pb-2 border-b border-border">
                    <span className="w-24 text-sm text-muted-foreground">Heading 1</span>
                    <span style={{ fontSize: '30px', lineHeight: '38px' }}>The quick brown fox</span>
                    <code className="text-sm ml-auto">30px / 38px</code>
                  </div>
                  <div className="flex items-baseline gap-4 pb-2 border-b border-border">
                    <span className="w-24 text-sm text-muted-foreground">Heading 2</span>
                    <span style={{ fontSize: '24px', lineHeight: '32px' }}>The quick brown fox</span>
                    <code className="text-sm ml-auto">24px / 32px</code>
                  </div>
                  <div className="flex items-baseline gap-4 pb-2 border-b border-border">
                    <span className="w-24 text-sm text-muted-foreground">Body</span>
                    <span style={{ fontSize: '16px', lineHeight: '24px' }}>The quick brown fox jumps</span>
                    <code className="text-sm ml-auto">16px / 24px</code>
                  </div>
                  <div className="flex items-baseline gap-4 pb-2 border-b border-border">
                    <span className="w-24 text-sm text-muted-foreground">Small</span>
                    <span style={{ fontSize: '14px', lineHeight: '20px' }}>The quick brown fox jumps over</span>
                    <code className="text-sm ml-auto">14px / 20px</code>
                  </div>
                </div>
              </div>

              {/* Spacing */}
              <div className="mb-8">
                <h3 className="mb-4">Spacing Scale</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: '1', value: '4px' },
                    { name: '2', value: '8px' },
                    { name: '3', value: '12px' },
                    { name: '4', value: '16px' },
                    { name: '5', value: '20px' },
                    { name: '6', value: '24px' },
                    { name: '8', value: '32px' },
                    { name: '10', value: '40px' },
                  ].map((space) => (
                    <div key={space.name} className="flex items-center gap-3">
                      <div className="bg-primary" style={{ width: space.value, height: '20px' }} />
                      <div>
                        <code className="text-sm">{space.name}</code>
                        <p className="text-xs text-muted-foreground">{space.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Border Radius */}
              <div>
                <h3 className="mb-4">Border Radius</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'sm', value: '4px' },
                    { name: 'base', value: '8px' },
                    { name: 'md', value: '12px' },
                    { name: 'lg', value: '16px' },
                    { name: 'xl', value: '20px' },
                    { name: '2xl', value: '24px' },
                    { name: 'full', value: '9999px' },
                  ].map((radius) => (
                    <div key={radius.name} className="flex items-center gap-3">
                      <div 
                        className="bg-primary w-12 h-12" 
                        style={{ borderRadius: radius.value }} 
                      />
                      <div>
                        <code className="text-sm">{radius.name}</code>
                        <p className="text-xs text-muted-foreground">{radius.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Components */}
          <TabsContent value="components" className="space-y-6">
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="mb-4">Component Library</h2>
              
              <div className="space-y-8">
                {/* Avatar */}
                <div>
                  <h3 className="mb-3">Avatar</h3>
                  <div className="bg-muted rounded-lg p-4 mb-3">
                    <p className="text-sm text-muted-foreground mb-3">
                      File: <code>/components/Avatar.tsx</code>
                    </p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary" />
                        <code className="text-xs">xs - 24px</code>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary" />
                        <code className="text-xs">sm - 32px</code>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary" />
                        <code className="text-xs">md - 40px</code>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-primary" />
                        <code className="text-xs">lg - 48px</code>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 rounded-full bg-primary" />
                        <code className="text-xs">xl - 64px</code>
                      </div>
                    </div>
                  </div>
                  <div className="relative bg-surface rounded-lg p-4">
                    <pre className="text-sm overflow-x-auto">
{`// React/Web
<Avatar 
  src="url" 
  alt="Name" 
  size="md" 
  status="online" 
/>

// React Native (iOS/Android)
<Avatar 
  source={{ uri: 'url' }}
  size={40}
  status="online"
/>`}
                    </pre>
                    <CopyButton text={`<Avatar src="url" alt="Name" size="md" status="online" />`} section="avatar" />
                  </div>
                </div>

                {/* Message Bubble */}
                <div>
                  <h3 className="mb-3">Message Bubble</h3>
                  <div className="bg-muted rounded-lg p-4 mb-3">
                    <p className="text-sm text-muted-foreground mb-3">
                      File: <code>/components/MessageBubble.tsx</code>
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <div className="bg-[#0057FF] text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[70%]">
                          <p className="text-sm">Sent message example</p>
                          <span className="text-xs opacity-70">12:34 PM</span>
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-[#F3F4F6] text-[#111827] rounded-2xl rounded-bl-sm px-4 py-2 max-w-[70%]">
                          <p className="text-sm">Received message example</p>
                          <span className="text-xs opacity-70">12:35 PM</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative bg-surface rounded-lg p-4">
                    <pre className="text-sm overflow-x-auto">
{`<MessageBubble
  message={{
    id: '1',
    body: 'Hello!',
    sender_id: 'user_1',
    created_at: new Date().toISOString(),
    type: 'text'
  }}
  isSent={true}
  showAvatar={true}
/>`}
                    </pre>
                    <CopyButton text={`<MessageBubble message={{...}} isSent={true} />`} section="message" />
                  </div>
                </div>

                {/* Message Composer */}
                <div>
                  <h3 className="mb-3">Message Composer</h3>
                  <div className="bg-muted rounded-lg p-4 mb-3">
                    <p className="text-sm text-muted-foreground mb-3">
                      File: <code>/components/MessageComposer.tsx</code>
                    </p>
                    <p className="text-sm">Multi-line input with attachment buttons and send/voice toggle</p>
                  </div>
                  <div className="relative bg-surface rounded-lg p-4">
                    <pre className="text-sm overflow-x-auto">
{`<MessageComposer
  onSend={(message, attachments) => {
    // Handle send
  }}
  onTyping={(isTyping) => {
    // Handle typing indicator
  }}
  placeholder="Type a message..."
/>`}
                    </pre>
                    <CopyButton text={`<MessageComposer onSend={...} />`} section="composer" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Database Schema */}
          <TabsContent value="database" className="space-y-6">
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="mb-4">Supabase Database Schema</h2>
              <p className="text-muted-foreground mb-6">
                AuroraLink uses Supabase's Key-Value store for data persistence. All data is stored with prefixed keys.
              </p>

              <div className="space-y-6">
                {/* Users */}
                <div className="relative bg-muted rounded-lg p-4">
                  <h3 className="mb-3">Users</h3>
                  <p className="text-sm text-muted-foreground mb-3">Key: <code>user:{'{user_id}'}</code></p>
                  <pre className="text-sm overflow-x-auto">
{`{
  id: string,
  full_name: string,
  username: string,
  email?: string,
  avatar_url?: string,
  status_message?: string,
  last_seen?: string (ISO 8601),
  is_online: boolean,
  metadata?: object,
  created_at: string (ISO 8601)
}`}
                  </pre>
                  <CopyButton text={`user:{user_id}`} section="user-schema" />
                </div>

                {/* Conversations */}
                <div className="relative bg-muted rounded-lg p-4">
                  <h3 className="mb-3">Conversations</h3>
                  <p className="text-sm text-muted-foreground mb-3">Key: <code>conversation:{'{conversation_id}'}</code></p>
                  <pre className="text-sm overflow-x-auto">
{`{
  id: string,
  type: 'dm' | 'group',
  title?: string,
  avatar_url?: string,
  created_by: string (user_id),
  last_message_id?: string,
  metadata?: object,
  created_at: string (ISO 8601),
  updated_at: string (ISO 8601)
}`}
                  </pre>
                  <CopyButton text={`conversation:{conversation_id}`} section="conv-schema" />
                </div>

                {/* Messages */}
                <div className="relative bg-muted rounded-lg p-4">
                  <h3 className="mb-3">Messages</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Key: <code>message:{'{conversation_id}'}:{'{message_id}'}</code>
                  </p>
                  <pre className="text-sm overflow-x-auto">
{`{
  id: string,
  conversation_id: string,
  sender_id: string (user_id),
  body?: string,
  type: 'text' | 'image' | 'file' | 'system',
  attachments?: Attachment[],
  reply_to?: string (message_id),
  edited_at?: string (ISO 8601),
  created_at: string (ISO 8601)
}`}
                  </pre>
                  <CopyButton text={`message:{conversation_id}:{message_id}`} section="msg-schema" />
                </div>

                {/* Note on RLS */}
                <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                  <h4 className="mb-2">Row Level Security (RLS) Note</h4>
                  <p className="text-sm">
                    For production deployment, implement Row Level Security policies in Supabase to ensure:
                  </p>
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    <li>Users can only read/write their own user data</li>
                    <li>Users can only access conversations they're members of</li>
                    <li>Messages are only visible to conversation members</li>
                    <li>Presence data is readable by all authenticated users</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* API Endpoints */}
          <TabsContent value="api" className="space-y-6">
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="mb-4">API Endpoints</h2>
              <p className="text-muted-foreground mb-6">
                Base URL: <code>https://{'{'}{'{'}project_id{'}'}{'}'}. supabase.co/functions/v1/make-server-29f6739b</code>
              </p>

              <div className="space-y-6">
                {/* Auth */}
                <div>
                  <h3 className="mb-4">Authentication</h3>
                  <div className="space-y-3">
                    <div className="relative bg-muted rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-success text-success-foreground rounded text-xs">POST</span>
                        <code className="text-sm">/auth/signup</code>
                      </div>
                      <pre className="text-sm">
{`{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}`}
                      </pre>
                      <CopyButton text={`POST /auth/signup`} section="auth-signup" />
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div>
                  <h3 className="mb-4">Messages</h3>
                  <div className="space-y-3">
                    <div className="relative bg-muted rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-success text-success-foreground rounded text-xs">POST</span>
                        <code className="text-sm">/messages/send</code>
                      </div>
                      <pre className="text-sm">
{`{
  "conversation_id": "conv_123",
  "body": "Hello!",
  "type": "text",
  "reply_to": "msg_456" // optional
}`}
                      </pre>
                      <CopyButton text={`POST /messages/send`} section="msg-send" />
                    </div>

                    <div className="relative bg-muted rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-success text-success-foreground rounded text-xs">POST</span>
                        <code className="text-sm">/messages/mark-read</code>
                      </div>
                      <pre className="text-sm">
{`{
  "message_ids": ["msg_123", "msg_456"]
}`}
                      </pre>
                      <CopyButton text={`POST /messages/mark-read`} section="msg-read" />
                    </div>
                  </div>
                </div>

                {/* Conversations */}
                <div>
                  <h3 className="mb-4">Conversations</h3>
                  <div className="space-y-3">
                    <div className="relative bg-muted rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs">GET</span>
                        <code className="text-sm">/conversations</code>
                      </div>
                      <p className="text-sm">Returns list of user's conversations</p>
                      <CopyButton text={`GET /conversations`} section="conv-list" />
                    </div>

                    <div className="relative bg-muted rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-success text-success-foreground rounded text-xs">POST</span>
                        <code className="text-sm">/conversations/create</code>
                      </div>
                      <pre className="text-sm">
{`{
  "type": "dm" | "group",
  "member_ids": ["user_2", "user_3"],
  "title": "Group Name" // optional, for groups
}`}
                      </pre>
                      <CopyButton text={`POST /conversations/create`} section="conv-create" />
                    </div>
                  </div>
                </div>

                {/* Upload */}
                <div>
                  <h3 className="mb-4">File Upload</h3>
                  <div className="relative bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-1 bg-success text-success-foreground rounded text-xs">POST</span>
                      <code className="text-sm">/upload</code>
                    </div>
                    <p className="text-sm mb-2">Content-Type: multipart/form-data</p>
                    <pre className="text-sm">
{`FormData:
  file: File
  type: 'avatar' | 'attachment'`}
                    </pre>
                    <CopyButton text={`POST /upload`} section="upload" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Mobile (iOS/Android) */}
          <TabsContent value="mobile" className="space-y-6">
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="mb-4">iOS & Android Implementation Guide</h2>
              
              <div className="space-y-6">
                <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                  <h3 className="mb-2">Responsive Breakpoints</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Mobile:</strong> 320px - 767px (Portrait & Landscape)</li>
                    <li><strong>Tablet:</strong> 768px - 1023px</li>
                    <li><strong>Desktop:</strong> ≥1024px</li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-3">Sizing Conversions</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="text-left py-2">Figma/Web</th>
                          <th className="text-left py-2">iOS (pt)</th>
                          <th className="text-left py-2">Android (dp)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['4px', '4pt', '4dp'],
                          ['8px', '8pt', '8dp'],
                          ['12px', '12pt', '12dp'],
                          ['16px', '16pt', '16dp'],
                          ['24px', '24pt', '24dp'],
                          ['32px', '32pt', '32dp'],
                          ['40px', '40pt', '40dp'],
                          ['48px', '48pt', '48dp'],
                        ].map(([web, ios, android]) => (
                          <tr key={web} className="border-b border-border/50">
                            <td className="py-2"><code>{web}</code></td>
                            <td className="py-2"><code>{ios}</code></td>
                            <td className="py-2"><code>{android}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="relative bg-muted rounded-lg p-4">
                  <h3 className="mb-3">Swift (iOS) Example</h3>
                  <pre className="text-sm overflow-x-auto">
{`// Message Bubble
struct MessageBubble: View {
    let message: Message
    let isSent: Bool
    
    var body: some View {
        HStack {
            if isSent { Spacer() }
            
            Text(message.body)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSent ? Color("Primary") : Color("Surface"))
                .foregroundColor(isSent ? .white : Color("TextPrimary"))
                .cornerRadius(16)
            
            if !isSent { Spacer() }
        }
    }
}`}
                  </pre>
                  <CopyButton text={`struct MessageBubble: View {...}`} section="ios-example" />
                </div>

                <div className="relative bg-muted rounded-lg p-4">
                  <h3 className="mb-3">Kotlin (Android) Example</h3>
                  <pre className="text-sm overflow-x-auto">
{`// Message Bubble Composable
@Composable
fun MessageBubble(
    message: Message,
    isSent: Boolean
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isSent) 
            Arrangement.End else Arrangement.Start
    ) {
        Text(
            text = message.body,
            modifier = Modifier
                .background(
                    color = if (isSent) Primary else Surface,
                    shape = RoundedCornerShape(16.dp)
                )
                .padding(horizontal = 16.dp, vertical = 8.dp),
            color = if (isSent) Color.White else TextPrimary
        )
    }
}`}
                  </pre>
                  <CopyButton text={`@Composable fun MessageBubble {...}`} section="android-example" />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Web */}
          <TabsContent value="web" className="space-y-6">
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="mb-4">Web Implementation</h2>
              
              <div className="space-y-6">
                <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                  <h3 className="mb-2">Technology Stack</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Framework:</strong> React 18+ with TypeScript</li>
                    <li><strong>Styling:</strong> Tailwind CSS v4.0</li>
                    <li><strong>Backend:</strong> Supabase (Auth, Database, Storage, Realtime)</li>
                    <li><strong>UI Components:</strong> shadcn/ui</li>
                    <li><strong>Icons:</strong> Lucide React</li>
                    <li><strong>Animations:</strong> Motion (Framer Motion)</li>
                  </ul>
                </div>

                <div className="relative bg-muted rounded-lg p-4">
                  <h3 className="mb-3">Installation</h3>
                  <pre className="text-sm overflow-x-auto">
{`# Install dependencies
npm install @supabase/supabase-js
npm install lucide-react
npm install motion

# Or with yarn
yarn add @supabase/supabase-js lucide-react motion`}
                  </pre>
                  <CopyButton text={`npm install @supabase/supabase-js lucide-react motion`} section="npm-install" />
                </div>

                <div className="relative bg-muted rounded-lg p-4">
                  <h3 className="mb-3">Environment Variables</h3>
                  <pre className="text-sm overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
                  </pre>
                  <CopyButton text={`VITE_SUPABASE_URL=...\nVITE_SUPABASE_ANON_KEY=...`} section="env-vars" />
                </div>

                <div>
                  <h3 className="mb-3">Accessibility Features</h3>
                  <ul className="list-disc list-inside text-sm space-y-2">
                    <li>All interactive elements have proper ARIA labels</li>
                    <li>Keyboard navigation support (Tab, Enter, Escape)</li>
                    <li>Screen reader compatible with semantic HTML</li>
                    <li>High contrast mode support</li>
                    <li>Reduced motion support via <code>prefers-reduced-motion</code></li>
                    <li>Focus indicators on all focusable elements</li>
                    <li>Proper heading hierarchy (h1, h2, h3)</li>
                    <li>Color contrast ratios meet WCAG AA standards</li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-3">Performance Optimizations</h3>
                  <ul className="list-disc list-inside text-sm space-y-2">
                    <li>Lazy loading for images and components</li>
                    <li>Virtualized lists for long conversation histories</li>
                    <li>Optimistic UI updates for instant feedback</li>
                    <li>Debounced typing indicators</li>
                    <li>Efficient re-renders with React.memo</li>
                    <li>Code splitting for route-based components</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>AuroraLink Design System v1.0 • Last updated: {new Date().toLocaleDateString()}</p>
          <p className="mt-2">For questions or support, contact your development team.</p>
        </div>
      </div>
    </div>
  );
}
