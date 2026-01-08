import React, { Fragment, useEffect } from "react";
import { Dialog, Transition } from '@headlessui/react';

export default function MobileDrawer({ open, onClose, title = "Rental Manager", items = [], footer }) {
  // Lock background scroll when drawer opens
  useEffect(() => {
    if (!open) return;

    // Save current scroll position
    const scrollY = window.scrollY;
    
    // Lock background scroll
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    // Cleanup: restore scroll when drawer closes
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[1000]">
        {/* Background overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="rm-overlay" />
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

                  {/* Body - Scrollable area */}
                  <nav className="rm-drawer__body">
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