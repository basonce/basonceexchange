import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Settings() {
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="px-6 pt-12 pb-20 flex flex-col h-full min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="bg-card rounded-[32px] p-6 border border-border flex flex-col items-center mb-8">
        <Avatar className="w-24 h-24 mb-4 border-4 border-background shadow-xl">
          <AvatarImage src={profile?.avatarUrl || undefined} />
          <AvatarFallback className="bg-secondary text-2xl font-bold">
            {profile?.fullName?.charAt(0) || profile?.email?.charAt(0) || <UserIcon />}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-bold">{profile?.fullName || 'Basonce User'}</h2>
        <p className="text-muted-foreground">{profile?.email}</p>

        <div className="w-full bg-background rounded-xl p-4 mt-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Pay ID</p>
          <p className="font-mono text-sm break-all">{profile?.userIdDisplay || user?.id}</p>
        </div>
      </div>

      <div className="mt-auto">
        <Button 
          variant="destructive" 
          className="w-full h-14 text-lg font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
