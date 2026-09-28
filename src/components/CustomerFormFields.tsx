import { field } from "@/components/ui";

type CustomerValues = {
  fullName?: string;
  fatherOrSpouseName?: string | null;
  customerType?: string;
  pan?: string | null;
  idReference?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  primaryMobile?: string;
  alternateMobile?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  residentialAddress?: string | null;
  permanentAddress?: string | null;
  leadSource?: string | null;
  referredBy?: string | null;
  salesPerson?: string | null;
  status?: string;
  internalNotes?: string | null;
};

function dateValue(value?: Date | null) {
  if (!value) return "";
  return value.toLocaleDateString("en-CA");
}

export function CustomerFormFields({ customer }: { customer?: CustomerValues }) {
  return (
    <>
      <label className="block text-sm sm:col-span-2">
        Full name
        <input name="fullName" required className={`${field} mt-1`} defaultValue={customer?.fullName ?? ""} />
      </label>
      <label className="block text-sm">
        Father / spouse
        <input name="fatherOrSpouseName" className={`${field} mt-1`} defaultValue={customer?.fatherOrSpouseName ?? ""} />
      </label>
      <label className="block text-sm">
        Type
        <select name="customerType" className={`${field} mt-1`} defaultValue={customer?.customerType ?? "individual"}>
          <option value="individual">Individual</option>
          <option value="huf">HUF</option>
          <option value="company">Company</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="block text-sm">
        Status
        <select name="status" className={`${field} mt-1`} defaultValue={customer?.status ?? "active"}>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="on_hold">On hold</option>
        </select>
      </label>
      <label className="block text-sm">
        Gender
        <input name="gender" className={`${field} mt-1`} defaultValue={customer?.gender ?? ""} />
      </label>
      <label className="block text-sm">
        Date of birth
        <input name="dateOfBirth" type="date" className={`${field} mt-1`} defaultValue={dateValue(customer?.dateOfBirth)} />
      </label>
      <label className="block text-sm">
        Primary mobile
        <input name="primaryMobile" required className={`${field} mt-1`} defaultValue={customer?.primaryMobile ?? ""} />
      </label>
      <label className="block text-sm">
        Alternate mobile
        <input name="alternateMobile" className={`${field} mt-1`} defaultValue={customer?.alternateMobile ?? ""} />
      </label>
      <label className="block text-sm">
        WhatsApp
        <input name="whatsapp" className={`${field} mt-1`} defaultValue={customer?.whatsapp ?? ""} />
      </label>
      <label className="block text-sm">
        Email
        <input name="email" type="email" className={`${field} mt-1`} defaultValue={customer?.email ?? ""} />
      </label>
      <label className="block text-sm">
        PAN
        <input name="pan" className={`${field} mt-1`} defaultValue={customer?.pan ?? ""} />
      </label>
      <label className="block text-sm">
        ID reference
        <input name="idReference" className={`${field} mt-1`} defaultValue={customer?.idReference ?? ""} />
      </label>
      <label className="block text-sm">
        Sales person
        <input name="salesPerson" className={`${field} mt-1`} defaultValue={customer?.salesPerson ?? ""} />
      </label>
      <label className="block text-sm">
        Lead source
        <input name="leadSource" className={`${field} mt-1`} defaultValue={customer?.leadSource ?? ""} />
      </label>
      <label className="block text-sm">
        Referred by
        <input name="referredBy" className={`${field} mt-1`} defaultValue={customer?.referredBy ?? ""} />
      </label>
      <label className="block text-sm sm:col-span-2">
        Residential address
        <textarea name="residentialAddress" className={`${field} mt-1`} rows={2} defaultValue={customer?.residentialAddress ?? ""} />
      </label>
      <label className="block text-sm sm:col-span-2">
        Permanent address
        <textarea name="permanentAddress" className={`${field} mt-1`} rows={2} defaultValue={customer?.permanentAddress ?? ""} />
      </label>
      <label className="block text-sm sm:col-span-2">
        Internal notes
        <textarea name="internalNotes" className={`${field} mt-1`} rows={2} defaultValue={customer?.internalNotes ?? ""} />
      </label>
    </>
  );
}
