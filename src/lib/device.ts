import { createHmac } from "node:crypto";
export function hashDeviceToken(employeeId:string,token:string){const pepper=process.env.DEVICE_PEPPER;if(!pepper)throw new Error("DEVICE_PEPPER belum dikonfigurasi");if(token.length<20||token.length>300)throw new Error("Device token tidak valid");return createHmac("sha256",pepper).update(`${employeeId}:${token}`).digest("hex");}
