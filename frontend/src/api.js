import axios from 'axios';

const API = axios.create({
  baseURL: 'https://cnviejo2-production.up.railway.app/api',
});

export default API;
