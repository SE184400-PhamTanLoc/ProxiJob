const USERS_KEY = "proxijob_users";
const CURRENT_USER_KEY = "proxijob_current_user";

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function writeCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export function registerUser({ fullName, email, password }) {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const existed = users.find((u) => u.email === normalizedEmail);

  if (existed) {
    return { ok: false, message: "Email đã tồn tại." };
  }

  users.push({
    id: crypto.randomUUID(),
    fullName: fullName.trim(),
    email: normalizedEmail,
    password,
    currentAddress: "",
    currentLatitude: null,
    currentLongitude: null,
    createdAt: Date.now(),
  });

  writeUsers(users);
  return { ok: true, message: "Đăng ký thành công. Mời bạn đăng nhập." };
}

export function loginUser({ email, password }) {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((u) => u.email === normalizedEmail);

  if (!user || user.password !== password) {
    return { ok: false, message: "Sai email hoặc mật khẩu." };
  }

  const safeUser = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    currentAddress: user.currentAddress || "",
    currentLatitude: user.currentLatitude ?? null,
    currentLongitude: user.currentLongitude ?? null,
  };

  writeCurrentUser(safeUser);
  return { ok: true, user: safeUser };
}

export function updateCurrentUserProfile({
  id,
  fullName,
  email,
  password,
  currentAddress,
  currentLatitude,
  currentLongitude,
}) {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const duplicateEmail = users.find(
    (u) => u.email === normalizedEmail && u.id !== id,
  );

  if (duplicateEmail) {
    return { ok: false, message: "Email đã tồn tại." };
  }

  const nextUsers = users.map((user) => {
    if (user.id !== id) return user;

    return {
      ...user,
      fullName: fullName.trim(),
      email: normalizedEmail,
      currentAddress: currentAddress.trim(),
      currentLatitude: currentLatitude ?? null,
      currentLongitude: currentLongitude ?? null,
      ...(password ? { password } : {}),
    };
  });

  const updatedUser = nextUsers.find((user) => user.id === id);

  writeUsers(nextUsers);

  const safeUser = {
    id: updatedUser.id,
    fullName: updatedUser.fullName,
    email: updatedUser.email,
    currentAddress: updatedUser.currentAddress || "",
    currentLatitude: updatedUser.currentLatitude ?? null,
    currentLongitude: updatedUser.currentLongitude ?? null,
  };

  writeCurrentUser(safeUser);
  return { ok: true, user: safeUser };
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}
