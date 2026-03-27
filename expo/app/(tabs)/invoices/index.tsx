import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, FileText, Search, RefreshCw, X, ChevronDown } from 'lucide-react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import InvoiceCard from '@/components/InvoiceCard';
import Colors from '@/constants/colors';
import { Invoice } from '@/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type StatusFilter = 'all' | Invoice['status'];

interface InvoiceSection {
  title: string;
  icon: 'recurring' | 'regular';
  data: Invoice[];
  totalCount?: number;
}

export default function InvoicesScreen() {
  const router = useRouter();
  const { invoices } = useBusiness();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const rotationAnims = useRef<Record<string, Animated.Value>>({}).current;

  const getRotationAnim = (key: string) => {
    if (!rotationAnims[key]) {
      rotationAnims[key] = new Animated.Value(0);
    }
    return rotationAnims[key];
  };

  const toggleSection = (sectionTitle: string) => {
    const isCollapsed = collapsedSections[sectionTitle];
    const anim = getRotationAnim(sectionTitle);
    
    Animated.timing(anim, {
      toValue: isCollapsed ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  const filteredInvoices = useMemo(() => {
    let result = [...invoices].sort(
      (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
    );

    if (statusFilter !== 'all') {
      result = result.filter((i) => i.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.clientName.toLowerCase().includes(query) ||
          i.invoiceNumber.toLowerCase().includes(query) ||
          i.clientEmail.toLowerCase().includes(query)
      );
    }

    return result;
  }, [invoices, statusFilter, searchQuery]);

  const sections = useMemo((): InvoiceSection[] => {
    const recurring = filteredInvoices.filter((i) => i.isRecurring);
    const regular = filteredInvoices.filter((i) => !i.isRecurring);

    const result: InvoiceSection[] = [];

    if (recurring.length > 0) {
      const isCollapsed = collapsedSections['Recurring Invoices'];
      result.push({ 
        title: 'Recurring Invoices', 
        icon: 'recurring', 
        data: isCollapsed ? [] : recurring,
        totalCount: recurring.length,
      });
    }

    if (regular.length > 0) {
      const isCollapsed = collapsedSections['One-Time Invoices'];
      result.push({ 
        title: 'One-Time Invoices', 
        icon: 'regular', 
        data: isCollapsed ? [] : regular,
        totalCount: regular.length,
      });
    }

    return result;
  }, [filteredInvoices, collapsedSections]);

  const statusCounts = useMemo(() => {
    return {
      all: invoices.length,
      draft: invoices.filter((i) => i.status === 'draft').length,
      sent: invoices.filter((i) => i.status === 'sent').length,
      paid: invoices.filter((i) => i.status === 'paid').length,
      overdue: invoices.filter((i) => i.status === 'overdue').length,
    };
  }, [invoices]);

  const filters: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Sent', value: 'sent' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' },
  ];

  const renderSectionHeader = ({ section }: { section: InvoiceSection }) => {
    const rotationAnim = getRotationAnim(section.title);
    const rotate = rotationAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '-90deg'],
    });

    return (
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={() => toggleSection(section.title)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          {section.icon === 'recurring' ? (
            <View style={styles.sectionIconRecurring}>
              <RefreshCw size={14} color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.sectionIconRegular}>
              <FileText size={14} color={Colors.success} />
            </View>
          )}
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
        <View style={styles.sectionHeaderRight}>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{section.totalCount ?? section.data.length}</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <ChevronDown size={18} color={Colors.textSecondary} />
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by client or invoice #"
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
      </View>

      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterButton,
              statusFilter === filter.value && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter(filter.value)}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === filter.value && styles.filterButtonTextActive,
              ]}
            >
              {filter.label}
            </Text>
            {statusCounts[filter.value] > 0 && (
              <View
                style={[
                  styles.filterBadge,
                  statusFilter === filter.value && styles.filterBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterBadgeText,
                    statusFilter === filter.value && styles.filterBadgeTextActive,
                  ]}
                >
                  {statusCounts[filter.value]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <InvoiceCard
            invoice={item}
            onPress={() => router.push(`/invoices/${item.id}`)}
          />
        )}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FileText size={40} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No invoices found' : 'No invoices yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first invoice to get paid'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/invoices/create')}
        activeOpacity={0.8}
      >
        <Plus size={24} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.backgroundCard,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterButtonTextActive: {
    color: Colors.white,
  },
  filterBadge: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  filterBadgeTextActive: {
    color: Colors.white,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconRecurring: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconRegular: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionBadge: {
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
