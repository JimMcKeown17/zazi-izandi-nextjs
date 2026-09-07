import { NextResponse } from 'next/server';
import { forwardProofRequest } from '@/lib/ea-set-password/proof-route';
export async function POST(request:Request) {
 const result=await forwardProofRequest(request,"discard");
 return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store','Pragma':'no-cache'}});
}
