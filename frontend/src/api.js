import axios from 'axios';

const API = axios.create({
  baseURL: 'https://cnviejo2-production-46d5.up.railway.app/api',
});

export default API;

