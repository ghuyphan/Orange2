import React, { useEffect, useMemo, useLayoutEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming, useSharedValue } from 'react-native-reanimated';

interface CameraHighlight {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ScannerFrameProps {
    highlight: CameraHighlight | null;
    layout: { width: number; height: number };
    scanFrame: { height: number; width: number };
}

const FRAME_SIZE = 220; // Consistent frame size

export const ScannerFrame: React.FC<ScannerFrameProps> = ({ highlight, layout, scanFrame }) => {
    // Initialize shared values (no need for separate initialX and initialY)
    const frameX = useSharedValue(0); 
    const frameY = useSharedValue(0);
    const frameWidth = useSharedValue(FRAME_SIZE);
    const frameHeight = useSharedValue(FRAME_SIZE);
    const frameColor = useSharedValue('rgba(255, 255, 255, 0.8)');
    const frameBackgroundColor = useSharedValue('rgba(255, 255, 255, 0)');

    // Always create these hooks, even if not used immediately
    const animatedFrameStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        borderRadius: 6,
        pointerEvents: 'box-none',
        backgroundColor: frameBackgroundColor.value,
        left: frameX.value,
        top: frameY.value,
        width: frameWidth.value,
        height: frameHeight.value,
        borderColor: frameColor.value,
    }));

    const animatedBorderStyle = useAnimatedStyle(() => ({
        borderColor: frameColor.value,
    }));

    // Always create the memoized corners
    const corners = useMemo(() => (
        <>
            <Animated.View style={[styles.corner, styles.topLeft, animatedBorderStyle]} />
            <Animated.View style={[styles.corner, styles.topRight, animatedBorderStyle]} />
            <Animated.View style={[styles.corner, styles.bottomLeft, animatedBorderStyle]} />
            <Animated.View style={[styles.corner, styles.bottomRight, animatedBorderStyle]} />
        </>
    ), [animatedBorderStyle]);

    // useEffect to handle highlight changes
    useEffect(() => {
        if (highlight && scanFrame && layout.width > 0 && layout.height > 0) {
            // Calculate scales and adjusted values
            const xScale = layout.width / scanFrame.height - 0.025;
            const yScale = layout.height / scanFrame.width - 0.01;
            const widthScale = layout.height / scanFrame.width + 0.1;
            const heightScale = layout.width / scanFrame.height + 0.15;

            const adjustedX = highlight.x * xScale;
            const adjustedY = highlight.y * yScale;
            const adjustedWidth = highlight.width * widthScale;
            const adjustedHeight = highlight.height * heightScale;

            // Animate to the new highlight area
            frameX.value = withSpring(adjustedX, { stiffness: 200, damping: 16 });
            frameY.value = withSpring(adjustedY, { stiffness: 200, damping: 16 });
            frameWidth.value = withSpring(adjustedWidth, { stiffness: 200, damping: 16 });
            frameHeight.value = withSpring(adjustedHeight, { stiffness: 200, damping: 16 });
            frameColor.value = '#FFCC00';
            frameBackgroundColor.value = 'rgba(128, 128, 128, 0.2)';
        } else {
            frameX.value = withTiming((layout.width - FRAME_SIZE) / 2);
            frameY.value = withTiming((layout.height - FRAME_SIZE) / 2);
            frameWidth.value = withTiming(FRAME_SIZE);
            frameHeight.value = withTiming(FRAME_SIZE);
            frameColor.value = withTiming('rgba(255, 255, 255, 0.8)');
            frameBackgroundColor.value = withTiming('rgba(255, 255, 255, 0)');
        }
    }, [highlight, layout, scanFrame, 
        frameX, frameY, frameWidth, frameHeight, 
        frameColor, frameBackgroundColor]);

    // useLayoutEffect to set initial position after layout is available
    useLayoutEffect(() => {
        if (layout.width > 0 && layout.height > 0) {
            frameX.value = (layout.width - FRAME_SIZE) / 2;
            frameY.value = (layout.height - FRAME_SIZE) / 2;
        }
    }, [layout]); 

    // Check for valid layout before rendering
    if (!layout || layout.width <= 0 || layout.height <= 0) {
        return null;
    }

    return <Animated.View style={[animatedFrameStyle]}>{corners}</Animated.View>;
};

const styles = StyleSheet.create({
    corner: {
        position: 'absolute',
        width: 15,
        height: 15,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopLeftRadius: 6,
        borderTopWidth: 3,
        borderLeftWidth: 3,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopRightRadius: 6,
        borderTopWidth: 3,
        borderRightWidth: 3,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomLeftRadius: 6,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomRightRadius: 6,
        borderBottomWidth: 3,
        borderRightWidth: 3,
    },
});