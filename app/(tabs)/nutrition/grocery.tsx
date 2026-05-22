import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, Share, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../../stores/authStore';
import {
  useLatestGroceryList, useUpsertGroceryList,
  useMealPlanById, generateGroceryItems, categorizeItem,
} from '../../../hooks/useMealPlan';
import { colors, typography, spacing } from '../../../constants/theme';
import type { GroceryItem, GroceryCategory, MealPlanData } from '../../../types/database';

const CATEGORY_META: Record<GroceryCategory, { label: string; emoji: string }> = {
  proteins:   { label: 'Proteins',       emoji: '🐟' },
  carbs:      { label: 'Carbs & Grains', emoji: '🌾' },
  vegetables: { label: 'Vegetables',     emoji: '🥦' },
  pantry:     { label: 'Pantry',         emoji: '🥫' },
  dairy:      { label: 'Dairy & Others', emoji: '🥛' },
  others:     { label: 'Others',         emoji: '📦' },
};

const CATEGORIES: GroceryCategory[] = ['proteins', 'carbs', 'vegetables', 'pantry', 'dairy', 'others'];

function formatQty(item: GroceryItem): string {
  return `${item.quantity}${item.unit}`;
}

function formatShareText(items: GroceryItem[]): string {
  const grouped: Partial<Record<GroceryCategory, GroceryItem[]>> = {};
  for (const item of items.filter(i => !i.checked)) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category]!.push(item);
  }
  let text = '🛒 Grocery List — Mayari\n\n';
  for (const cat of CATEGORIES) {
    const catItems = grouped[cat];
    if (!catItems?.length) continue;
    const meta = CATEGORY_META[cat];
    text += `${meta.emoji} ${meta.label.toUpperCase()}\n`;
    for (const item of catItems) {
      text += `• ${item.name} (${formatQty(item)})\n`;
    }
    text += '\n';
  }
  return text.trim();
}

export default function GroceryScreen() {
  const { meal_plan_id } = useLocalSearchParams<{ meal_plan_id?: string }>();
  const { data: existingList, isLoading, refetch } = useLatestGroceryList();
  const upsertList = useUpsertGroceryList();
  const { data: mealPlanForGrocery } = useMealPlanById(meal_plan_id ?? null);

  const [groceryId, setGroceryId] = useState<string | null>(null);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<GroceryCategory>>(new Set());
  const [boughtCollapsed, setBoughtCollapsed] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  useEffect(() => {
    if (isLoading) return;
    if (meal_plan_id && mealPlanForGrocery && isFirstLoad.current) {
      isFirstLoad.current = false;
      const generated = generateGroceryItems(mealPlanForGrocery.plan_data as MealPlanData);
      setGroceryId(existingList?.id ?? null);
      setItems(generated);
      scheduleSave(existingList?.id ?? null, meal_plan_id, generated);
      return;
    }
    if (existingList && isFirstLoad.current) {
      isFirstLoad.current = false;
      setGroceryId(existingList.id);
      setItems(existingList.items);
    }
  }, [isLoading, existingList, meal_plan_id, mealPlanForGrocery]);

  function scheduleSave(gId: string | null, planId: string | null, newItems: GroceryItem[]) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      upsertList.mutate(
        { groceryId: gId, mealPlanId: planId, name: null, items: newItems },
        {
          onSuccess: async () => {
            const { data } = await refetch();
            if (data?.id && !gId) {
              setGroceryId(data.id);
            }
          },
        },
      );
    }, 800);
  }

  function updateItems(newItems: GroceryItem[]) {
    setItems(newItems);
    scheduleSave(groceryId, meal_plan_id ?? null, newItems);
  }

  function toggleCheck(id: string) {
    updateItems(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  }

  function toggleCategory(cat: GroceryCategory) {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  function handleAddItem() {
    const name = newName.trim();
    if (!name) { Alert.alert('', 'Enter an item name'); return; }
    const qty = parseFloat(newQty) || 1;
    const newItem: GroceryItem = {
      id: Math.random().toString(36).slice(2),
      name,
      quantity: qty,
      unit: 'g',
      category: categorizeItem(name),
      checked: false,
    };
    updateItems([...items, newItem]);
    setNewName('');
    setNewQty('');
    setShowAddModal(false);
  }

  async function handleShare() {
    const text = formatShareText(items);
    try {
      await Share.share({ message: text, title: 'Grocery List — Mayari' });
    } catch {
      // user cancelled
    }
  }

  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Grocery List</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>📤 Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {unchecked.length === 0 && checked.length === 0 && (
          <Text style={styles.emptyText}>No items yet. Generate from your meal plan or add items manually.</Text>
        )}

        {CATEGORIES.map(cat => {
          const catItems = unchecked.filter(i => i.category === cat);
          if (catItems.length === 0) return null;
          const collapsed = collapsedCategories.has(cat);
          const meta = CATEGORY_META[cat];
          return (
            <View key={cat} style={styles.categorySection}>
              <TouchableOpacity style={styles.categoryHeader} onPress={() => toggleCategory(cat)}>
                <Text style={styles.categoryTitle}>{meta.emoji} {meta.label}</Text>
                <Text style={styles.categoryChevron}>{collapsed ? '▶' : '▼'} {catItems.length}</Text>
              </TouchableOpacity>
              {!collapsed && catItems.map(item => (
                <TouchableOpacity key={item.id} style={styles.itemRow} onPress={() => toggleCheck(item.id)}>
                  <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                    {item.checked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>{formatQty(item)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {checked.length > 0 && (
          <View style={styles.categorySection}>
            <TouchableOpacity style={styles.categoryHeader} onPress={() => setBoughtCollapsed(b => !b)}>
              <Text style={[styles.categoryTitle, styles.boughtTitle]}>Bought ✓</Text>
              <Text style={styles.categoryChevron}>{boughtCollapsed ? '▶' : '▼'} {checked.length}</Text>
            </TouchableOpacity>
            {!boughtCollapsed && checked.map(item => (
              <TouchableOpacity key={item.id} style={[styles.itemRow, styles.itemRowChecked]} onPress={() => toggleCheck(item.id)}>
                <View style={[styles.checkbox, styles.checkboxChecked]}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
                <Text style={[styles.itemName, styles.itemNameChecked]}>{item.name}</Text>
                <Text style={[styles.itemQty, styles.itemNameChecked]}>{formatQty(item)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add item FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Text style={styles.fabText}>➕</Text>
      </TouchableOpacity>

      {/* Add item modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Item</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Item name (e.g. Itlog)"
              placeholderTextColor={colors.text.muted}
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              value={newQty}
              onChangeText={setNewQty}
              placeholder="Quantity in grams (optional)"
              placeholderTextColor={colors.text.muted}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAddModal(false); setNewName(''); setNewQty(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAddItem}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '700' },
  shareBtn: { backgroundColor: colors.bg.secondary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  shareBtnText: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600' },
  scroll: { flex: 1 },
  container: { padding: spacing.lg, paddingBottom: 100 },
  emptyText: { color: colors.text.muted, textAlign: 'center', marginTop: 40, fontSize: typography.sm },
  categorySection: { marginBottom: spacing.md },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.xs },
  categoryTitle: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  boughtTitle: { color: colors.text.muted },
  categoryChevron: { color: colors.text.muted, fontSize: typography.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  itemRowChecked: { opacity: 0.5 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemName: { flex: 1, color: colors.text.primary, fontSize: typography.base },
  itemNameChecked: { textDecorationLine: 'line-through', color: colors.text.muted },
  itemQty: { color: colors.text.muted, fontSize: typography.sm, minWidth: 48, textAlign: 'right' },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText: { fontSize: 24 },
  modalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bg.elevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, gap: spacing.md },
  modalTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  modalInput: { backgroundColor: colors.bg.secondary, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.text.primary, fontSize: typography.base, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalButtons: { flexDirection: 'row', gap: spacing.sm },
  modalCancel: { flex: 1, borderRadius: 10, paddingVertical: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  modalCancelText: { color: colors.text.secondary, fontSize: typography.base },
  modalSave: { flex: 1, backgroundColor: colors.brand.primary, borderRadius: 10, paddingVertical: spacing.sm, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
});
