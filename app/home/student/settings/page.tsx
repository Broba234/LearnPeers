"use client";

import { useEffect, useState } from "react";
import { User, Palette, UserCog, Bell, CreditCard } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import SettingsShell, { type SettingsTab } from "@/components/settings/SettingsShell";
import StudentProfileSection from "@/components/settings/StudentProfileSection";
import AppearanceSection from "@/components/settings/AppearanceSection";
import AccountSection from "@/components/settings/AccountSection";
import NotificationsSection from "@/components/settings/NotificationsSection";
import PaymentMethodSection from "@/components/settings/PaymentMethodSection";

export default function StudentSettings() {
  const [email, setEmail] = useState<string>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? undefined));
  }, []);

  const tabs: SettingsTab[] = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" />, content: <StudentProfileSection /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, content: <NotificationsSection role="student" /> },
    { id: "payment", label: "Payment", icon: <CreditCard className="h-4 w-4" />, content: <PaymentMethodSection /> },
    { id: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" />, content: <AppearanceSection /> },
    { id: "account", label: "Account", icon: <UserCog className="h-4 w-4" />, content: <AccountSection email={email} role="student" /> },
  ];

  return <SettingsShell tabs={tabs} />;
}
