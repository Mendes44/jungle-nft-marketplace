/** Origens configuráveis mantêm REST e WebSocket na mesma implantação, sem servidor privado. */
export const origemSocket =
  import.meta.env.VITE_SOCKET_URL ||
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
