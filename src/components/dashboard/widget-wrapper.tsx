"use client";
import { useEffect, useState } from "react";
import { isVisible } from "@/lib/dashboard-widgets";

interface Props {
  widgetKey: string;
  children: React.ReactNode;
}

export function WidgetWrapper({ widgetKey, children }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(isVisible(widgetKey));
    function onChange() {
      setVisible(isVisible(widgetKey));
    }
    window.addEventListener("storage", onChange);
    window.addEventListener("dashboard-widgets-changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("dashboard-widgets-changed", onChange);
    };
  }, [widgetKey]);

  if (!visible) return null;
  return <>{children}</>;
}
