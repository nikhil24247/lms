import { mapGraphUser, type GraphUser } from './azure-ad-graph';

/** ponytail: assert mapping stays aligned with Entra field list — no network */
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const sample: GraphUser = {
  id: 'oid-1',
  displayName: 'Ada Lovelace',
  mail: null,
  userPrincipalName: 'ada@contoso.com',
  employeeId: 'E100',
  department: 'Engineering',
  jobTitle: 'Engineer',
  officeLocation: 'London',
  accountEnabled: true,
  manager: {
    id: 'oid-mgr',
    mail: 'mgr@contoso.com',
    userPrincipalName: 'mgr@contoso.com',
  },
};

const mapped = mapGraphUser(sample);
assert(mapped, 'expected mapped user');
assert(mapped.email === 'ada@contoso.com', 'email from UPN');
assert(mapped.fullName === 'Ada Lovelace', 'name');
assert(mapped.hrisEmployeeId === 'E100', 'employee id');
assert(mapped.departmentName === 'Engineering', 'department');
assert(mapped.designation === 'Engineer', 'job title → designation');
assert(mapped.location === 'London', 'office location');
assert(mapped.managerEmail === 'mgr@contoso.com', 'manager email');
assert(mapped.accountEnabled === true, 'account status');

const disabled = mapGraphUser({ ...sample, accountEnabled: false, mail: 'a@b.com' });
assert(disabled?.accountEnabled === false, 'disabled account');

const skipped = mapGraphUser({ id: 'x', userPrincipalName: 'not-an-email' });
assert(skipped === null, 'skip non-email UPN');

console.log('azure-ad-graph.selfcheck: ok');
