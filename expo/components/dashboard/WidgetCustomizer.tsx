import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
} from 'react-native';
import { X, ChevronUp, ChevronDown, LayoutGrid } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { WidgetConfig, WIDGET_DEFINITIONS } from '@/types/dashboard';

interface WidgetCustomizerProps {
  visible: boolean;
  widgets: WidgetConfig[];
  isNodeViewConnected: boolean;
  onClose: () => void;
  onSave: (widgets: WidgetConfig[]) => void;
}

export default React.memo(function WidgetCustomizer({
  visible,
  widgets,
  isNodeViewConnected,
  onClose,
  onSave,
}: WidgetCustomizerProps) {
  const [localWidgets, setLocalWidgets] = React.useState<WidgetConfig[]>(widgets);

  const prevVisibleRef = React.useRef(false);

  React.useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setLocalWidgets(widgets);
    }
    prevVisibleRef.current = visible;
  }, [visible, widgets]);

  const handleToggle = React.useCallback((id: string) => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  }, []);

  const handleMoveUp = React.useCallback((index: number) => {
    if (index <= 0) return;
    setLocalWidgets((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const handleMoveDown = React.useCallback((index: number) => {
    setLocalWidgets((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleSave = React.useCallback(() => {
    onSave(localWidgets);
    onClose();
  }, [localWidgets, onSave, onClose]);

  const handleReset = React.useCallback(() => {
    setLocalWidgets(
      WIDGET_DEFINITIONS.map((w) => ({ id: w.id, visible: true }))
    );
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <LayoutGrid size={18} color={Colors.primary} />
              <Text style={styles.title}>Customise Dashboard</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Toggle widgets on/off and reorder them using the arrows.
          </Text>

          <ScrollView style={styles.list} bounces={false} showsVerticalScrollIndicator={false}>
            {localWidgets.map((widget, index) => {
              const def = WIDGET_DEFINITIONS.find((d) => d.id === widget.id);
              if (!def) return null;

              const isDisabled = def.nodeViewOnly && !isNodeViewConnected;

              return (
                <View
                  key={widget.id}
                  style={[styles.widgetRow, isDisabled && styles.widgetRowDisabled]}
                >
                  <View style={styles.widgetInfo}>
                    <Text style={[styles.widgetTitle, isDisabled && styles.widgetTitleDisabled]}>
                      {def.title}
                    </Text>
                    <Text style={styles.widgetDesc}>
                      {isDisabled ? 'Requires NODEView' : def.description}
                    </Text>
                  </View>

                  <View style={styles.widgetActions}>
                    <View style={styles.arrows}>
                      <TouchableOpacity
                        onPress={() => handleMoveUp(index)}
                        disabled={index === 0}
                        style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <ChevronUp size={16} color={index === 0 ? Colors.textMuted : Colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleMoveDown(index)}
                        disabled={index === localWidgets.length - 1}
                        style={[styles.arrowBtn, index === localWidgets.length - 1 && styles.arrowBtnDisabled]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <ChevronDown
                          size={16}
                          color={index === localWidgets.length - 1 ? Colors.textMuted : Colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                    <Switch
                      value={widget.visible && !isDisabled}
                      onValueChange={() => handleToggle(widget.id)}
                      disabled={isDisabled}
                      trackColor={{ false: Colors.surface, true: Colors.primary + '80' }}
                      thumbColor={widget.visible && !isDisabled ? Colors.primary : Colors.textMuted}
                    />
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.7}>
              <Text style={styles.saveBtnText}>Save Layout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  widgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '40',
  },
  widgetRowDisabled: {
    opacity: 0.45,
  },
  widgetInfo: {
    flex: 1,
    marginRight: 12,
  },
  widgetTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  widgetTitleDisabled: {
    color: Colors.textMuted,
  },
  widgetDesc: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  widgetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arrows: {
    flexDirection: 'column',
    gap: 2,
  },
  arrowBtn: {
    padding: 2,
  },
  arrowBtnDisabled: {
    opacity: 0.3,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
