import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Search, Package, Pencil, Trash2, X, Plus, Check } from 'lucide-react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { formatCurrency, formatDate } from '@/utils/helpers';
import Colors from '@/constants/colors';
import { Product } from '@/types';

export default function ProductsScreen() {
  const { products, updateProduct, deleteProduct, addOrUpdateProducts } = useBusiness();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState('');

  const filteredProducts = products
    .filter((p) =>
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());

  const handleEditProduct = useCallback((product: Product) => {
    setEditingProduct(product);
    setEditDescription(product.description);
    setEditUnitPrice(product.unitPrice.toString());
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingProduct) return;
    
    const price = parseFloat(editUnitPrice);
    if (!editDescription.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    updateProduct(editingProduct.id, {
      description: editDescription.trim(),
      unitPrice: price,
    });
    setEditingProduct(null);
    setEditDescription('');
    setEditUnitPrice('');
  }, [editingProduct, editDescription, editUnitPrice, updateProduct]);

  const handleDeleteProduct = useCallback((product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.description}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteProduct(product.id),
        },
      ]
    );
  }, [deleteProduct]);

  const handleAddProduct = useCallback(() => {
    setIsAddModalVisible(true);
    setEditDescription('');
    setEditUnitPrice('');
  }, []);

  const handleSaveNewProduct = useCallback(() => {
    const price = parseFloat(editUnitPrice);
    if (!editDescription.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    addOrUpdateProducts([{ description: editDescription.trim(), unitPrice: price }]);
    setIsAddModalVisible(false);
    setEditDescription('');
    setEditUnitPrice('');
  }, [editDescription, editUnitPrice, addOrUpdateProducts]);

  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productIcon}>
        <Package size={20} color={Colors.primary} />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.productMeta}>
          Last used: {formatDate(item.lastUsed)}
        </Text>
      </View>
      <Text style={styles.productPrice}>{formatCurrency(item.unitPrice)}</Text>
      <View style={styles.productActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditProduct(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Pencil size={18} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteProduct(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={18} color={Colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  ), [handleEditProduct, handleDeleteProduct]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Package size={48} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No Products Yet</Text>
      <Text style={styles.emptySubtitle}>
        Products will appear here as you add items to invoices, or you can add them manually.
      </Text>
      <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
        <Plus size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add Product</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEditModal = () => (
    <Modal
      visible={editingProduct !== null}
      animationType="slide"
      transparent
      onRequestClose={() => setEditingProduct(null)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Product</Text>
            <TouchableOpacity onPress={() => setEditingProduct(null)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.input}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Product description"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Unit Price (£)</Text>
            <TextInput
              style={styles.input}
              value={editUnitPrice}
              onChangeText={setEditUnitPrice}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
            <Check size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderAddModal = () => (
    <Modal
      visible={isAddModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setIsAddModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Product</Text>
            <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.input}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Product description"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Unit Price (£)</Text>
            <TextInput
              style={styles.input}
              value={editUnitPrice}
              onChangeText={setEditUnitPrice}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveNewProduct}>
            <Plus size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {products.length > 0 && (
          <TouchableOpacity style={styles.headerAddButton} onPress={handleAddProduct}>
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
        </Text>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          filteredProducts.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {renderEditModal()}
      {renderAddModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  headerAddButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  productMeta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.success,
    marginRight: 8,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
