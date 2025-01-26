"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";

export function ProfileButton() {
  const { user, signInWithGoogle, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden hover:opacity-80 transition-opacity"
      >
        {user ? (
          user.photoURL ? (
            <Image
              src={user.photoURL}
              alt="Profile"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <UserCircleIcon className="w-full h-full text-gray-600" />
          )
        ) : (
          <UserCircleIcon className="w-full h-full text-gray-600" />
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1">
          {user ? (
            <>
              <div className="px-4 py-2 border-b">
                <div className="font-medium truncate">{user.displayName}</div>
                <div className="text-sm text-gray-500 truncate">{user.email}</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                signInWithGoogle();
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign in with Google
            </button>
          )}
        </div>
      )}
    </div>
  );
} 