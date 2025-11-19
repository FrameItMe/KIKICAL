// =============================
// CONFIG
// =============================
const API_BASE = "http://localhost:8000";

// =============================
// REGISTER
// =============================
async function handleRegister(event) {
  if (event) event.preventDefault();

  const name = document.getElementById("reg-name")?.value.trim();
  const email = document.getElementById("reg-email")?.value.trim();
  const password = document.getElementById("reg-password")?.value;
  const cpassword = document.getElementById("reg-cpassword")?.value;

  const msg = document.getElementById("register-message");

  if (!name || !email || !password) {
    msg.textContent = "กรุณากรอกข้อมูลให้ครบ";
    msg.className = "auth-message error";
    return;
  }
  if (password !== cpassword) {
    msg.textContent = "รหัสผ่านไม่ตรงกัน";
    msg.className = "auth-message error";
    return;
  }

  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    msg.textContent = data.error || "สมัครไม่สำเร็จ";
    msg.className = "auth-message error";
    return;
  }

  msg.textContent = "สมัครสำเร็จ!";
  msg.className = "auth-message success";

  setTimeout(() => {
    window.location.href = "login.html";
  }, 800);
}

// =============================
// LOGIN
// =============================
async function handleLogin(event) {
  if (event) event.preventDefault();

  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;

  const msg = document.getElementById("login-message");

  if (!email || !password) {
    msg.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
    msg.className = "auth-message error";
    return;
  }

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    msg.textContent = data.error || "เข้าสู่ระบบไม่สำเร็จ";
    msg.className = "auth-message error";
    return;
  }

  // เก็บ token ไว้ใน localStorage
  localStorage.setItem("token", data.token);

  msg.textContent = "เข้าสู่ระบบสำเร็จ!";
  msg.className = "auth-message success";

  setTimeout(() => {
    window.location.href = "predashboard.html";
  }, 800);
}

// =============================
// LOGOUT
// =============================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// =============================
// CHECK AUTH
// =============================
async function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { "Authorization": token },
  });

  const data = await res.json();
  return data.user || null;
}
