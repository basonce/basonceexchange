import { Hexagon } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
      <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border border-border mb-6">
        <Hexagon className="w-12 h-12 text-primary" />
      </div>
      <h1 className="text-4xl font-bold text-foreground mb-4">404 - Page Not Found</h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        Oops! The page you're looking for doesn't exist on BasonceScan or has been moved.
      </p>
      <Link 
        href="/" 
        className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
