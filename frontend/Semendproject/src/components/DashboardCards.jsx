function DashboardCards() {
  const stats = [
    { title: 'Articles', value: 24 },
    { title: 'Drafts', value: 8 },
    { title: 'Published', value: 16 },
    { title: 'Versions', value: 42 },
  ];

  return (
    <div className='dashboard-cards'>
      {stats.map((card, index) => (
        <div className='dashboard-card' key={index}>
          <h2>{card.title}</h2>
          <p>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

export default DashboardCards;