import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '@/context/ThemeContext';

interface ThemedFilterSkeletonProps {
  show?: boolean;
}

export function ThemedFilterSkeleton({ show = true }: ThemedFilterSkeletonProps) {
  const { currentTheme: colorScheme } = useTheme();

  const skeletonColors = useMemo(() => {
    return colorScheme === 'dark'
      ? ['#604D45', '#504038', '#42332D', '#352722', '#2A1C18']
      : ['#E3D8CD', '#E0D0C3', '#DBCABA', '#D8C3B1', '#D5BCAB'];
  }, [colorScheme]);

  return (
    <MotiView
      transition={{
        type: 'timing',
        duration: 50,
      }}
      style={styles.filterContainer}
    >
      <Skeleton.Group show={show}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.filterButton}>
            <Skeleton 
              colors={skeletonColors} 
              width={100} 
              height={40} 
              radius={15} 
            />
          </View>
        ))}
      </Skeleton.Group>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  filterButton: {
    borderRadius: 5,
  },
});