"use client";

import { useEffect, useState } from "react";
import { User, Palette, UserCog, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import SettingsShell, { type SettingsTab } from "@/components/settings/SettingsShell";
import TutorProfileSection from "@/components/settings/TutorProfileSection";
import AppearanceSection from "@/components/settings/AppearanceSection";
import AccountSection from "@/components/settings/AccountSection";
import NotificationsSection from "@/components/settings/NotificationsSection";

export default function TutorSettings() {
  const [email, setEmail] = useState<string>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? undefined));
  }, []);

  const tabs: SettingsTab[] = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" />, content: <TutorProfileSection /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, content: <NotificationsSection role="tutor" /> },
    { id: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" />, content: <AppearanceSection /> },
    { id: "account", label: "Account", icon: <UserCog className="h-4 w-4" />, content: <AccountSection email={email} role="tutor" /> },
  ];

  return <SettingsShell tabs={tabs} />;
}
