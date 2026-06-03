import React from 'react';
import PageShell from '../components/PageShell';

const Blog = () => (
  <PageShell
    title="ServeGo Blog"
    description="Stay up to date with the latest home service trends, tips, and news from ServeGo."
    actions={[
      { label: 'Home', to: '/' },
      { label: 'Services', to: '/services' },
    ]}
  />
);

export default Blog;
