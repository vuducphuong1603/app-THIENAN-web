import type { ReactNode } from "react";

export type NavItem = {
  label: string;
  href: string;
  icon?: ReactNode;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};
