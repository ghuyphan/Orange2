import { ScrollView, StyleProp, ViewStyle, StyleSheet, View, TouchableWithoutFeedback, Pressable } from 'react-native';
import React from 'react';
import { t } from '@/i18n';
import { useColorScheme } from 'react-native';
import { ThemedText } from './ThemedText';

type ThemedFilterProps = {
    selectedFilter: string;
    onFilterChange: (filter: string) => void;
    style?: StyleProp<ViewStyle>;
};

const ThemedFilter = React.memo(({ selectedFilter, onFilterChange, style }: ThemedFilterProps) => {
    const filters = [
        { key: 'all', label: t('homeScreen.filters.all') },
        { key: 'bank', label: t('homeScreen.filters.bank') },
        { key: 'ewallet', label: t('homeScreen.filters.ewallet') },
        { key: 'store', label: t('homeScreen.filters.store') }
    ];

    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    return (
        <ScrollView showsHorizontalScrollIndicator={false} horizontal contentContainerStyle={[styles.filterContainer, style]}>
            {filters.map((filter) => (
                <Pressable
                    key={filter.key}

                    onPress={() => onFilterChange(filter.key)}
                    style={[
                        styles.filterButton,
                        isDarkMode ? styles.darkModeButton : styles.lightModeButton,
                        selectedFilter === filter.key && (isDarkMode ? styles.selectedFilterDarkMode : styles.selectedFilterLightMode)
                    ]}
                    android_ripple={{ color: 'rgba(255, 255, 255, 0.3)',borderless: false }}
                >
                    <ThemedText type={'defaultSemiBold'} style={selectedFilter === filter.key && (isDarkMode ? styles.selectedFilterTextDarkMode : styles.selectedFilterTextLightMode)}>
                        {filter.label}
                    </ThemedText>
                </Pressable>
            ))}
        </ScrollView>
    );
});

const styles = StyleSheet.create({
    filterContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 10,
        overflow: 'hidden',
    },
    selectedFilterLightMode: {
        backgroundColor: '#5A4639', // example color for light mode
    },
    selectedFilterTextLightMode: {
        color: '#FFF'
    },
    selectedFilterTextDarkMode: {
        color: '#5A4639'
    },
    selectedFilterDarkMode: {
        backgroundColor: '#FFF5E1', // example color for dark mod
    },
    darkModeButton: {
        backgroundColor: '#5A3D30',
    },
    lightModeButton: {
        backgroundColor: '#D3B8A3',
    },
    filterText: {
        // color: '#E7C9B3', // Default text color
    },
});

export default ThemedFilter;
