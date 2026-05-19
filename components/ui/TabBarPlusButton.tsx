import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useUIStore } from '../../stores/uiStore';
import { colors } from '../../constants/theme';

export default function TabBarPlusButton(_props: BottomTabBarButtonProps) {
  const openLogModal = useUIStore((s) => s.openLogModal);
  return (
    <TouchableOpacity style={styles.container} onPress={() => openLogModal()} activeOpacity={0.85}>
      <View style={styles.circle}>
        <Text style={styles.plus}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 12,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: colors.bg.tabBar,
  },
  plus: { color: colors.white, fontSize: 28, lineHeight: 30 },
});
