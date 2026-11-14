import { isIP } from 'node:net'

export function assertProductionTransport({host,cert,key}) {
  if(Boolean(cert)!==Boolean(key))throw new Error('Cần cả TLS_CERT_FILE và TLS_KEY_FILE.')
  const ipv4Loopback=isIP(host)===4 && host.split('.')[0]==='127'
  let ipv6Loopback=false
  if(isIP(host)===6)ipv6Loopback=new URL(`http://[${host}]`).hostname==='[::1]'
  const loopback=host==='localhost'||ipv4Loopback||ipv6Loopback
  if(!loopback&&!cert)throw new Error('Public bind cần chứng chỉ TLS. Sau reverse proxy hãy bind loopback.')
}
