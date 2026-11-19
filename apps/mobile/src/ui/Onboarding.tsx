import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTokens } from '@/theme';
import { IconButton } from './kit';
import { Col, Row, Screen, Text } from './kit';

export const STEPS = 6;

/** Progress bar, optional back, title and one-line subtitle. Every onboarding screen uses it. */
export function OnbShell({ step, title, sub, children, back = true }: { step: number; title: string; sub?: string; children: ReactNode; back?: boolean }) {
  const tk = useTokens();
  const router = useRouter();
  return (
    <Screen>
      <Row gap={10} justify="flex-start" style={{ minHeight: 44 }}>
        {back && step > 1 ? <IconButton icon="back" label="Back" onPress={() => router.back()} /> : null}
      </Row>
      <Row gap={5} style={{ marginBottom: 2 }}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? tk.accent : tk.line2 }} />
        ))}
      </Row>
      <Col gap={8} style={{ paddingTop: 12 }}>
        <Text v="title" accessibilityRole="header">{title}</Text>
        {sub ? <Text c="fg2" style={{ maxWidth: 360 }}>{sub}</Text> : null}
      </Col>
      {children}
    </Screen>
  );
}
