const defaultMaleAvatar = require('../../assets/AvatarNam.png');
const defaultFemaleAvatar = require('../../assets/AvatarNu.png');

/**
 * Validates whether an avatar URL is a valid remote resource.
 * @param {string} url 
 * @returns {boolean}
 */
export const isValidAvatar = (url) => {
  if (!url) return false;
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (
    trimmed.toLowerCase() === "string" ||
    trimmed.toLowerCase() === "null" ||
    trimmed === ""
  ) {
    return false;
  }
  // Reject stock/placeholder URLs to force local default avatars
  if (trimmed.includes("unsplash.com") || trimmed.includes("pravatar.cc")) {
    return false;
  }
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image/")
  );
};

/**
 * Guesses the gender based on a Vietnamese name.
 * @param {string} name 
 * @returns {string} 'Nam' | 'Nữ'
 */
export const guessGenderByName = (name) => {
  if (!name) return 'Nam';
  const cleanName = name.toLowerCase().trim();
  
  // Common Vietnamese female name indicators
  const femaleIndicators = [
    'thị', 'nữ', 'hương', 'lan', 'hồng', 'mai', 'phương', 'vân', 'trinh', 'oanh', 'nhi', 'vy',
    'huyền', 'trang', 'hằng', 'tuyết', 'dung', 'chi', 'kiều', 'nga', 'trà', 'yến', 'thùy', 'diệp', 
    'thảo', 'hạnh', 'như', 'quỳnh', 'hoa', 'phượng', 'liên', 'nguyệt'
  ];
  
  if (femaleIndicators.some(indicator => cleanName.includes(indicator))) {
    return 'Nữ';
  }
  
  return 'Nam';
};

/**
 * Gets the React Native Image source object.
 * @param {string} avatarUrl 
 * @param {string} gender 
 * @param {string} name 
 * @returns {object|number} Local require source or remote URI object
 */
export const getAvatarSource = (avatarUrl, gender, name) => {
  if (isValidAvatar(avatarUrl)) {
    if (avatarUrl.includes("supabase.co") && !avatarUrl.includes("?t=")) {
      return { uri: `${avatarUrl}?t=${Date.now()}` };
    }
    return { uri: avatarUrl };
  }

  const cleanGender = (gender || '').toLowerCase().trim();
  if (cleanGender === 'nữ' || cleanGender === 'female' || cleanGender === 'nu') {
    return defaultFemaleAvatar;
  }
  if (cleanGender === 'nam' || cleanGender === 'male') {
    return defaultMaleAvatar;
  }

  // Fallback to name guessing if gender is not specified
  const guessed = guessGenderByName(name);
  return guessed === 'Nữ' ? defaultFemaleAvatar : defaultMaleAvatar;
};
