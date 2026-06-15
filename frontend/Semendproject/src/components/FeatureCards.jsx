function FeatureCards() {
  const features = [
    {
      title: 'Draft Management',
      desc: 'Save and continue unfinished content anytime.',
    },
    {
      title: 'Version Tracking',
      desc: 'Maintain complete edit history and restore versions.',
    },
    {
      title: 'Semantic Search',
      desc: 'Search content intelligently using AI embeddings.',
    },
  ];

  return (
    <section className='features-section'>
      {features.map((item, index) => (
        <div className='feature-card' key={index}>
          <h2>{item.title}</h2>
          <p>{item.desc}</p>
        </div>
      ))}
    </section>
  );
}

export default FeatureCards;