'use client';

import { CheckSquare, FileText, Home, LogOut, Menu, MessageSquare, Target, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

interface SidebarLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function SidebarLayout({ children, activeTab, onTabChange, onLogout }: SidebarLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'goals', label: 'My Goals', icon: Target },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'requests', label: 'My Requests', icon: FileText },
    { id: 'announcements', label: 'Announcements', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-ashinaga-teal-100 z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <h1 className="text-lg font-semibold">Ashinaga Scholar Portal</h1>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-ashinaga-teal-100 transform transition-transform duration-200 ease-in-out z-40',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-ashinaga-teal-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="font-semibold">Ashinaga</h1>
                <p className="text-xs text-gray-600">Scholar Portal</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        activeTab === item.id && "bg-ashinaga-teal-50 text-ashinaga-teal-700 hover:bg-ashinaga-teal-100"
                      )}
                      onClick={() => {
                        onTabChange(item.id);
                        setIsSidebarOpen(false);
                      }}
                    >
                      <Icon className="mr-3 h-4 w-4" />
                      {item.label}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-ashinaga-teal-100">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={onLogout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64 min-h-screen">
        <div className="pt-16 lg:pt-0">{children}</div>
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
