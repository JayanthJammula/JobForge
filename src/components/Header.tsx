import { Briefcase, User, Target } from "lucide-react";
import { Button } from "./ui/button";

interface HeaderProps {
  onProfileClick?: () => void;
  onSmartMatchClick?: () => void;
}

export function Header({ onProfileClick, onSmartMatchClick }: HeaderProps) {
  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="w-6 h-6" />
          <span className="font-semibold">JobForge</span>
        </div>
        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onSmartMatchClick}>
            <Target className="w-4 h-4 mr-2" />
            Smart Match
          </Button>
          <Button variant="ghost" size="sm" onClick={onProfileClick}>
            <User className="w-4 h-4 mr-2" />
            My Profile
          </Button>
        </nav>
      </div>
    </header>
  );
}
