import React, { Fragment, useEffect } from "react";
import { Dialog, Transition } from '@headlessui/react';

export default function MobileDrawer({ open, onClose, title = "Rental Manager", items = [], footer }) {
  // Lock the REAL scroll container - definitive fix
  useEffect(() => {
    if (!open) return;

    // 1) Find the actual scroll container
    const scrollRoot = 
      document.querySelector('[data-scroll-root]') ||  // Custom marked container
      document.querySelector('#root') ||               // React root
      document.scrollingElement ||                     // Standard (usually html)
      document.documentElement ||                      // Fallback
      document.body;                                   // Last resort

    const isWindowRoot = (scrollRoot === document.body || scrollRoot === document.documentElement);
    const savedScrollPos = isWindowRoot ? window.scrollY : scrollRoot.scrollTop;
    const originalStyle = scrollRoot.style.cssText;

    // 2) Hard lock the background - prevent ALL scrolling
    const preventScroll = (e) => e.preventDefault();
    
    // Add global scroll prevention
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('scroll', preventScroll, { passive: false });

    // 3) Apply scroll lock to the real container
    if (isWindowRoot) {
      // Window scrolling - lock body with position fixed
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScrollPos}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Container scrolling - lock the container
      scrollRoot.style.overflow = 'hidden';
      scrollRoot.style.height = '100%';
    }

    // 4) Cleanup function
    return () => {
      // Remove event listeners
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('scroll', preventScroll);
      
      // Restore original styles
      scrollRoot.style.cssText = originalStyle;
      
      // Restore scroll position
      if (isWindowRoot) {
        window.scrollTo(0, savedScrollPos);
      } else {
        scrollRoot.scrollTop = savedScrollPos;
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[1000]">
        {/* Background overlay - swallows all background input */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div 
            className="rm-overlay" 
            onTouchMove={(e) => e.preventDefault()}
            onWheel={(e) => e.preventDefault()}
            onScroll={(e) => e.preventDefault()}
          />
        </Transition.Child>

        {/* Drawer panel */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="rm-drawer pointer-events-auto">
                  {/* Header - Static */}
                  <header className="rm-drawer__header">
                    <div className="rm-brand">
                      <span className="rm-badge">RM</span>
                      <span className="rm-title">{title}</span>
                    </div>
                    <button className="rm-close" aria-label="Close" onClick={onClose}>✕</button>
                  </header>

                  {/* Body - ONLY scrollable area with proper constraints */}
                  <nav 
                    className="rm-drawer__body"
                    onTouchMove={(e) => e.stopPropagation()} // Allow inner scroll
                    onWheel={(e) => e.stopPropagation()}     // Allow inner scroll
                  >
                    {items.map((it, i) =>
                      it?.divider ? (
                        <hr key={`div-${i}`} className="rm-divider" />
                      ) : (
                        <a key={it.label + i} href={it.to} className="rm-item" onClick={onClose}>
                          <span className="rm-icon">{it.icon}</span>
                          <span className="rm-label">{it.label}</span>
                        </a>
                      )
                    )}
                  </nav>

                  {/* Footer - Static with safe area */}
                  <footer className="rm-drawer__footer">
                    {footer}
                  </footer>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}