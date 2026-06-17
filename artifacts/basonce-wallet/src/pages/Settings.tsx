import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";

export function Settings() {
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <div className="px-4 pt-12 pb-4 bg-background sticky top-0 z-10 flex items-center gap-4">
        <Link href="/" className="p-2"><ChevronLeft className="w-6 h-6" /></Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="px-4 pt-8">
        <div className="bg-card rounded-[32px] p-6 border border-border flex flex-col items-center mb-8">
          <Avatar className="w-24 h-24 mb-4 border-4 border-background shadow-xl">
            <AvatarImage src={profile?.avatarUrl || undefined} />
            <AvatarFallback className="bg-secondary text-2xl font-bold">
              {profile?.fullName?.charAt(0) || profile?.email?.charAt(0) || <UserIcon />}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold">{profile?.fullName || 'Basonce User'}</h2>
          <p className="text-muted-foreground">{profile?.email}</p>

          <div className="w-full bg-background rounded-xl p-4 mt-6 text-center border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Pay ID</p>
            <p className="font-mono text-sm break-all font-medium text-foreground">{profile?.userIdDisplay || user?.id}</p>
          </div>
        </div>

        <Button 
          variant="destructive" 
          className="w-full h-14 text-lg font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 rounded-full"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
