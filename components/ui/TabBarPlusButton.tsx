import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Plus } from 'phosphor-react-native';
import { useUIStore } from '../../stores/uiStore';
import { colors } from '../../constants/theme';

export default function TabBarPlusButton(props: object) {
  const openLogModal = useUIStore(s => s.openLogModal);
  return (
    <TouchableOpacity
      {...props}
      style={styles.wrapper}
      onPress={() => openLogModal()}
      activeOpacity={0.85}
    >
      <View style={styles.circle}>
        <Plus size={26} color={colors.bg.primary} weight="bold" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.brand.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
