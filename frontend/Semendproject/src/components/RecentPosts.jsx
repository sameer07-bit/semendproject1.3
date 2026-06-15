function RecentPosts() {
  return (
    <div className='recent-posts'>
      <h2>Recent Content</h2>

      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>Cloud Computing Basics</td>
            <td>Published</td>
            <td>25 May 2026</td>
          </tr>

          <tr>
            <td>AI Draft Research</td>
            <td>Draft</td>
            <td>24 May 2026</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default RecentPosts;
