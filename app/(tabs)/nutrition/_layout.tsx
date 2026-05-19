import { Stack } from 'expo-router';

export default function NutritionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="log" />
      <Stack.Screen name="search" />
      <Stack.Screen name="food/[id]" />
      <Stack.Screen name="barcode" />
      <Stack.Screen name="goals" />
    </Stack>
  );
}
