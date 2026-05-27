'use client'

import { usePathname } from 'next/navigation'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { Newspaper, Rss, Settings } from 'lucide-react'
import type { ModuleSubmenuProps } from '@/lib/modules/submenu-types'

const menuItems = [
  { label: 'Feed', path: '/skim', icon: Newspaper },
  { label: 'Sources', path: '/skim/sources', icon: Rss },
  { label: 'Settings', path: '/skim/settings', icon: Settings },
]

export default function SkimSubmenu(_props: ModuleSubmenuProps) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton asChild isActive={pathname === item.path}>
                <a href={item.path} className="flex items-center">
                  <item.icon className="mr-2 size-4" />
                  <span>{item.label}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
