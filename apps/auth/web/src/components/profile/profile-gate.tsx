'use client';

import { useState } from 'react';
import { ProfileList } from './profile-list';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { OpenAddProfileProvider } from './context/profile-gate-context';
import { AddProfileDialog } from './add-profile';

export function ProfileGate() {
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <OpenAddProfileProvider value={() => setAddOpen(true)}>
      <div
        key={editing ? 'edit' : 'select'}
        className={cn(
          'flex flex-col items-center animate-fade-in-scale transition-opacity duration-500 max-w-4/5',
          addOpen && 'pointer-events-none opacity-0',
        )}
      >
        <h1 className="text-[clamp(30px,3.5vw,4rem)] font-bold leading-tight text-center my-[0.67em] mx-0">
          {editing ? (
            '프로필 관리'
          ) : (
            <>
              Nookbox를 이용할
              <br className="md:hidden" /> 프로필을 선택하세요.
            </>
          )}
        </h1>

        <ProfileList />

        <Button
          variant="outline"
          onClick={() => setEditing(!editing)}
          className={cn(
            'h-auto cursor-pointer rounded-none px-[1.5em] py-[0.6em] text-[clamp(14px,1.2vw,18px)] tracking-wider transition-colors mt-8 mb-4',
            editing
              ? 'border-white bg-white! text-black! hover:bg-neutral-200! hover:text-black!'
              : 'border-neutral-500 bg-transparent text-neutral-500 hover:border-white hover:bg-transparent hover:text-white',
          )}
        >
          {editing ? '완료' : '프로필 관리'}
        </Button>
      </div>

      <AddProfileDialog open={addOpen} onOpenChange={setAddOpen} />
    </OpenAddProfileProvider>
  );
}
