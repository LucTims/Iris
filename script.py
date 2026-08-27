import sys

with open('src/components/TopHeader.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'import { useState } from "react";',
    'import { useState, useRef, useEffect } from "react";'
)

hook_code = '''  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);'''
content = content.replace('  const [userMenuOpen, setUserMenuOpen] = useState(false);', hook_code)

content = content.replace('<div className="relative shrink-0">', '<div className="relative shrink-0" ref={menuRef}>')

profile_link = '''                <Link 
                  href="/profile" 
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  <span className="material-symbols-outlined text-base text-neutral-400">person</span>
                  <span>Mon profil</span>
                </Link>
'''
content = content.replace(profile_link, '')

dashboard_start = '''                <Link 
                  href="/dashboard"'''
content = content.replace(dashboard_start, profile_link + dashboard_start)

home_link = '''                <Link 
                  href="/" 
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  <span className="material-symbols-outlined text-base text-neutral-400">home</span>
                  <span>Page d&apos;accueil du site</span>
                </Link>
'''
content = content.replace(home_link, '')

with open('src/components/TopHeader.tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
