import React from 'react';
import ProfileClientLayout from './client-layout';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <ProfileClientLayout>{children}</ProfileClientLayout>;
}
