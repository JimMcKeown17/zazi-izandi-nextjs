import type { Metadata } from 'next';
import '../globals.css';
export const metadata:Metadata={title:'Set your Zazi iZandi password',referrer:'no-referrer',robots:{index:false,follow:false}};
// A separate root forces a full document load from the main site. Its Clerk and
// analytics scripts cannot survive client navigation into the secret-link page.
export default function PasswordLayout({children}:{children:React.ReactNode}) {
 return <html lang="en"><body className="antialiased">{children}</body></html>;
}
