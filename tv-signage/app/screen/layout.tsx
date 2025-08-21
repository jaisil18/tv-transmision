import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pantalla - Sistema TV CODECRAFT',
  description: 'Pantalla de visualización de contenido multimedia',
  robots: 'noindex, nofollow',
  other: {
    'feature-policy': 'autoplay *',
    'permissions-policy': 'autoplay=*',
  },
};

export default function ScreenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover" />
      <meta httpEquiv="Feature-Policy" content="autoplay *" />
      <meta httpEquiv="Permissions-Policy" content="autoplay=*" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <div className="min-h-screen bg-black overflow-hidden">
        {children}
      </div>
    </>
  );
}
