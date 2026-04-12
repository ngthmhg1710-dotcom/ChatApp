import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function register(userData) {
  return axios.post(`${API_URL}/auth/register`, userData);
}

export async function login(credentials) {
  return axios.post(`${API_URL}/auth/login`, credentials);
}

export async function getCurrentUser() {
  return axios.get(`${API_URL}/auth/me`);
}