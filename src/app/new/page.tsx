"use client";

import Editor from '@/shared/components/Editor';
import React  from 'react';


export default function New() {
    return (<main className='h-screen flex flex-col'>
        <Editor className='grow'/>
        <p className='cursor-wait'>CopyRight</p>
    </main>);
}