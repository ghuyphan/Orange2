const tintColorLight = '#FF8C42'; // Bright, emphasizing a warm orange
const tintColorDark = '#FFA726';  // Brighter to stand out in dark mode

export const Colors = {
  light: {
    text: '#3A2E24', // Dark gray-black for readability
    background: '#FAFAFA', // Pure white for background
    tint: tintColorLight,
    icon: '#FFB74D', // Soft orange for icons
    inputBackground: '#F5EFE4', // Light beige for input background
    placeHolder: '#9E9E9E', // Gray for placeholders
    tabIconDefault: '#BDBDBD', // Light gray for unselected tab icons
    tabIconSelected: tintColorLight,
    error: '#E53935', // Bright red for clear error notifications
    toastBackground: '#EADFD7', // Light orange for toast notifications
    buttonBackground: '#D3B8A3', // Soft orange for button backgrounds
    buttonHighlight: '#FFECB3', // Brighter to highlight on hover
    cardBackground: '#F5EFE4', // Light beige for card background
    cardFooter: '#EADFD7', // Bright orange for card footer
    logoIcon: '#FF8A65', // Dark orange for logos
  },
  dark: {
    text: '#FFF5E1', // Light gray for text on dark background
    background: '#181818', // Very dark background for dark mode
    tint: tintColorDark,
    icon: '#FFB74D', // Bright orange for icons
    inputBackground: '#322C28', // Dark gray for input background
    placeHolder: '#B0BEC5', // Light blue-gray for placeholders
    tabIconDefault: '#757575', // Gray for unselected tab icons
    tabIconSelected: tintColorDark,
    error: '#EF5350', // Bright red for error notifications
    toastBackground: '#322C28', // Dark brown for toast notifications
    buttonBackground: '#6B5A4E', // Dark brown for button backgrounds
    buttonHighlight: '#8D6E63', // Brighter for hover effect
    cardBackground: '#322C28', // Dark gray for card background
    cardFooter: '#4E3B32', // Soft brown for card footer
    logoIcon: '#FF7043', // Dark orange for logos
  },
};
