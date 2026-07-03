// Thin adapter so game screens can import AppHeader with title/subtitle/showBack props
import React from 'react';
import { AppHeader as Header } from '@/components/common/AppHeader';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
}

export default function AppHeader({ title, subtitle, showBack }: Props) {
  return (
    <Header
      titulo={title}
      subtitulo={subtitle}
      mostrarVolver={showBack ?? false}
    />
  );
}
