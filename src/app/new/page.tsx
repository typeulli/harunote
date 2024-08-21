import Editor from '@/shared/components/Editor';
import React  from 'react';

import type { Metadata } from 'next'
 
export const metadata: Metadata = {
    title: 'New note',
    description: "Create new note"
}
 
// export async function generateMetadata({ params }) {
//   return {
//     title: '...',
//   }
// }

export default function New() {
    return (<main className='h-screen flex flex-col'>
        <Editor className='grow'/>
        <p className='cursor-wait'>CopyRight</p>
    </main>);
}